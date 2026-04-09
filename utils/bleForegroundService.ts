import { DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import BleManager, { Peripheral } from "react-native-ble-manager";
// import { closeDB, initDB, insertSequence } from './bleDBHandler';
import { getOnnxSessionAsync } from '@/hooks/useOnnxSession';

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

const serviceUUIDList = ["19b10000-e8f2-537e-4f6c-d104768a1214"];
const IMUCharacteristicUUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const ACKCharacteristicUUID = "19b10001-e8f2-537e-4f6c-d104768a1215";
const GRAVITY = 9.81;
const DEG_TO_RAD = Math.PI/180.0;
// const TRAIN_MEAN = [
//   /* replace this with 6 real mean values from preprocess_params.json */
//     1.949113368988037,
//     -9.522315979003906,
//     0.4659557640552521,
//     0.0047860657796263695,
//     -0.007489662151783705,
//     0.023314522579312325
// ];

// const TRAIN_STD = [
//   /* replace this with 6 real std values from preprocess_params.json */
//     1.8461289405822754,
//     1.5603747367858887,
//     1.77070152759552,
//     0.19229814410209656,
//     0.31257760524749756,
//     0.4868285059928894
// ];

// const TRAIN_MEAN =  [
//     0.2214090624144928,
//     5.882740490765002,
//     0.703475510803618,
//     -0.028925593252715674,
//     -0.004357751272143631,
//     0.013581516738418387
//   ];

// const TRAIN_STD = [
//     3.8835016024559406,
//     7.027475864646837,
//     3.848425947323089,
//     1.0577535556392528,
//     1.0060204571018132,
//     0.6818279477680056
// ];
  const TRAIN_MEAN=  [
    0.2645193636417389,
    6.764277458190918,
    0.19192476570606232,
    -0.022541599348187447,
    -0.00015575188444927335,
    0.011813514865934849
  ];
  const TRAIN_STD=  [
    3.3741064071655273,
    6.695526123046875,
    2.9194276332855225,
    1.0264290571212769,
    0.8717849850654602,
    0.6346139311790466
  ];

const NUM_AXES = 3
const SAMPLES_PER_PACKET = 6
const ACCEL_SAMPLES_PER_PACKET = SAMPLES_PER_PACKET
const GYRO_SAMPLES_PER_PACKET = SAMPLES_PER_PACKET
const SEQ_LENGTH = 20
const WINDOW_LEN = 5
const INFERENCE_CHUNK_SIZE = 20;
const SAMPLES_PER_SEQ = SAMPLES_PER_PACKET * SEQ_LENGTH
const INFERENCE_CHUNKS_PER_SEQ = SAMPLES_PER_SEQ / INFERENCE_CHUNK_SIZE;
// Self-Reminder this is inclusive.
const WINDOW_END_INIT  = WINDOW_LEN - 1;
const WINDOW_START_INIT = 0
const PACKET_BYTE_COUNT = (1 + (ACCEL_SAMPLES_PER_PACKET + GYRO_SAMPLES_PER_PACKET) * NUM_AXES) * 4;
const ACK_DELAY_TIME = 15;


interface connectedP {
    connectedPeripheral: Peripheral | null;
    timeConnnected: number;
}
export interface seqPacket {
    packetId: number,
    accelData: Float32Array[];
    gyroData: Float32Array[];
}

type Sample6 = [number, number, number, number, number, number];

const connectedPeripheral: connectedP = { connectedPeripheral: null, timeConnnected: 0 };
let deviceUUID = "";

let isConnecting = false;

// ARQ State
let window_start = WINDOW_START_INIT;
let window_end = WINDOW_END_INIT;
let window_recv = new Uint32Array([0]);
let sequence: seqPacket[] = [];
let ackTimer: ReturnType<typeof setTimeout> | null = null;
let packets_received = 0;

// ------------------------------------------------------------------
// ARQ Protocol Helper Functions
// ------------------------------------------------------------------
const packetIdToSeqNum = (packetId: number): number => {
    return packetId % SEQ_LENGTH;
}

const parseBytesIntoSeqPacket = (byteArr: Uint8Array): seqPacket | null => {
    if (byteArr.length < PACKET_BYTE_COUNT) return null;

    const parseDataArr = (byteOffset: number, samplesPerPacket: number, view: DataView) => {
        const parsedData = [];
        for (let i = 0; i < samplesPerPacket; i++) {
            let currentIndx = [];
            for (let j = 0; j < NUM_AXES; j++) {
                currentIndx[j] = view.getFloat32(byteOffset + (i * (NUM_AXES * 4) + (j * 4)), true);
            }
            parsedData[i] = new Float32Array(currentIndx);
        }
        return parsedData;
    }

    const buffer = byteArr.buffer;
    const view = new DataView(buffer, 0, buffer.byteLength);
    const packetId = view.getUint32(0, true);

    const accelData = parseDataArr(4, ACCEL_SAMPLES_PER_PACKET, view);
    // Warning, this + 1 is to account for packet ID at start of packet. Do not remove.
    const gyroData = parseDataArr(4 * (1 + (NUM_AXES * ACCEL_SAMPLES_PER_PACKET)), GYRO_SAMPLES_PER_PACKET, view);

    return { packetId, accelData, gyroData };
}

const shiftWindowBase = (): void => {
    while ((window_recv[0] & 1) !== 0) {
        window_start = (window_start + 1) % SEQ_LENGTH;
        window_recv[0] = window_recv[0] >>> 1;
    }
    window_end = (window_start + (WINDOW_LEN - 1)) % SEQ_LENGTH;
}

// TODO: There might be a bounds error here in the logic.
// Sometimes packets either at end of a window get inserted when they shouldn't
// This also causes duplicate packets to be saved into the sequence.
const isPacketInWindow = (packet: seqPacket): boolean => {
    const seqNum = packetIdToSeqNum(packet.packetId);
    if (window_start <= window_end) {
        return (seqNum >= window_start && seqNum <= window_end);
    } else {
        return (seqNum >= window_start || seqNum <= window_end);
    }
}

const insertPacketIntoSeq = (packet: seqPacket): number => {
    if (!isPacketInWindow(packet)) {
        // console.log({
        //     "Failed to insert": packetIdToSeqNum(packet.packetId),
        //     "Window base": window_start,
        //     "Window end": window_end
        // });
        return -1;
    }
    
    const seqNum = packetIdToSeqNum(packet.packetId);
    sequence[seqNum] = packet;
    
    let window_offset = seqNum - window_start;

    // This is for the wrap around, but I think it's causing errors.
    // If the seq is less than the window start then this inheriently
    // implies that it should be wrapped around... which it shouldn't like 99% of the time.
    // Also should add bounds check to see if window end < window start which implies
    // the window has wrapped around.
    if (window_offset < 0) {
        window_offset += SEQ_LENGTH; 
    }

    // If the bit at this offset is already 1, we already have this packet!
    if ((window_recv[0] & (1 << window_offset)) !== 0) {
        console.log(`Dropped duplicate packet: ${packet.packetId}`);
        return -2; 
    }

    window_recv[0] = window_recv[0] | (1 << window_offset);

    if (window_offset === 0) {
        shiftWindowBase();
    }

    return seqNum;
}

const sendAck = () => {
    ackTimer = null;

    if (!deviceUUID) {
        console.error("No device UUID found for ACK!");
        return;
    }

    try {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);

        view.setUint32(0, window_start, true);
        view.setUint32(4, window_recv[0], true);

        const dataArray = Array.from(new Uint8Array(buffer));

        BleManager.writeWithoutResponse(
            deviceUUID,
            serviceUUIDList[0],
            ACKCharacteristicUUID,
            dataArray
        ).then(() => {
            // console.debug(`ACK Sent: Base ${window_start}, Flags ${window_recv[0]}`);
        }).catch((error) => {
            console.error("Failed to send ACK", error);
        });
    } catch (error) {
        console.error("Failed to build/send ACK", error);
    }
}

const triggerAckTimer = () => {
    if (ackTimer !== null) {
        clearTimeout(ackTimer);
    }
    ackTimer = setTimeout(sendAck, ACK_DELAY_TIME);
}

const clearAckTimer = () => {
    if (ackTimer) {
        clearTimeout(ackTimer);
        ackTimer = null;
    }
}

const resetARQState = () => {
    window_start = WINDOW_START_INIT;
    window_end = WINDOW_END_INIT;
    window_recv[0] = 0;
    sequence = [];
    packets_received = 0;
    clearAckTimer();
}

// Very very temporary...
// In the future I see this being used after the user connects to their device for the first time.
const getSavedDeviceInfo = () => {
    return "75:63:F0:1F:7A:CA";
}

const handleDiscoveredPeripheral = (p: Peripheral) => {
    if (!p.name) p.name = "NO NAME";

    if (p.id == getSavedDeviceInfo()) {
        if (isConnecting || connectedPeripheral.connectedPeripheral) return;
        isConnecting = true;
        console.log("User device discovered, attempting connection!");
        BleManager.connect(p.id).then(() => {
            console.log(`Connection succesful to ${p.id}`);
            connectedPeripheral.connectedPeripheral = p;
            connectedPeripheral.timeConnnected = Date.now();
            deviceUUID = p.id;
            
            BleManager.stopScan().catch(() => {
                console.log("Failed to stop scanning...");
            });
        }).catch(() => {
            console.error(`Failed to connect to ${p.id}`);
        }).finally(() => {
            isConnecting = false;
        });
    }
}

// TODO: this should loop until a device is found.
const scanForPeripherals = async () => {
    const state = await BleManager.checkState();
    let testCond = false;

    if (state == "off") {
        console.debug("Enabling bluetooth")
        await BleManager.enableBluetooth();
    }

    BleManager.scan({serviceUUIDs: serviceUUIDList, seconds: 5}).then(() => {
        console.log("Scanning Started!");
    }).catch(() => {
        console.error("Scan failed 😡");
    });
}

const handleConnectedPeripheral = (event: any) => {
    console.log(`Connected to ${event.peripheral}`);
    isConnecting = false;
    deviceUUID = event.peripheral;
    
    BleManager.requestMTU(event.peripheral, 185).then(() => {
        console.log("Successfully achieved desired MTU");
    }).catch(() => {
        console.log("Failed to request MTU!");
    });
    
    BleManager.retrieveServices(event.peripheral).then(() => {
        BleManager.startNotification(event.peripheral, serviceUUIDList[0], IMUCharacteristicUUID).then(() => {
            console.log(`Notifications for ${IMUCharacteristicUUID} started!`);
        }).catch(() => {
            console.error(`Failed to start notifications for characteristic ${IMUCharacteristicUUID}`);
        });
    });

    BackgroundService.updateNotification(
        {
            taskDesc: "Peripheral device connected!"
        }
    );

}

const handleDiconnectedPeripheral = (event: any) => {
    console.debug(`Disconnected from ${event.peripheral}`);
    if (event.peripheral == connectedPeripheral.connectedPeripheral?.id) {
        connectedPeripheral.connectedPeripheral = null;
    }
    deviceUUID = "";
    isConnecting = false;
    resetARQState(); // Reset the window logic on disconnect
    BackgroundService.updateNotification(
        {
            taskDesc: "WARNING: Device Disconnected!"
        }
    );
}

/* DEBUG */
const printWindow = (lastInserted: number) => {
    let window = "[";
    for (let i = 0; i < 5; i++) {
        if (window_recv[0] & (1 << i)) {
            window += "█";
        } else {
            window += "_";
        }
    }
    window += "]";
    console.log(`Last Inserted: ${sequence[lastInserted].packetId}, Seq ${lastInserted} Base: ${window_start}, ${window} time: ${Date.now()}`);
}
/* DEBUG */

function build120x6Window(rawSequence: seqPacket[]): Sample6[] {
  const window: Sample6[] = [];

  rawSequence.forEach((packet) => {
    for (let i = 0; i < SAMPLES_PER_PACKET; i++) {
      const ax = packet.accelData[i][0] * GRAVITY;
      const ay = packet.accelData[i][1] * GRAVITY;
      const az = packet.accelData[i][2] * GRAVITY;

      const gx = packet.gyroData[i][0] * DEG_TO_RAD;
      const gy = -(packet.gyroData[i][1] * DEG_TO_RAD); // flip
      const gz = -(packet.gyroData[i][2] * DEG_TO_RAD); // flip

      window.push([ax, ay, az, gx, gy, gz]);
    }
  });

  return window; // shape: (120, 6)
}

// temporary JS smoother placeholder
// replace later with true Butterworth coefficients if needed
function lowPassSmooth120(window: Sample6[]): Sample6[] {
  const alpha = 0.25;
  const out: Sample6[] = [];

  for (let i = 0; i < window.length; i++) {
    if (i === 0) {
      out.push([...window[i]] as Sample6);
      continue;
    }

    const prev = out[i - 1];
    const curr = window[i];

    out.push([
      alpha * curr[0] + (1 - alpha) * prev[0],
      alpha * curr[1] + (1 - alpha) * prev[1],
      alpha * curr[2] + (1 - alpha) * prev[2],
      alpha * curr[3] + (1 - alpha) * prev[3],
      alpha * curr[4] + (1 - alpha) * prev[4],
      alpha * curr[5] + (1 - alpha) * prev[5],
    ]);
  }

  return out;
}

function normalize120(window: Sample6[]): Sample6[] {
  return window.map((row) => {
    const out = new Array(6) as Sample6;

    for (let j = 0; j < 6; j++) {
      const std = Math.abs(TRAIN_STD[j]) < 1e-8 ? 1 : TRAIN_STD[j];
      out[j] = (row[j] - TRAIN_MEAN[j]) / std;
    }

    return out;
  });
}

function flatten20x6(chunk: Sample6[]): Float32Array {
  const flat = new Float32Array(20 * 6);
  let k = 0;

  for (const row of chunk) {
    for (const val of row) {
      flat[k++] = val;
    }
  }

  return flat;
}

// ------------------------------
// main pipeline
// ------------------------------
const processAndInferSequence = async (rawSequence: seqPacket[]) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const ort = await import("onnxruntime-react-native");
    const session = await getOnnxSessionAsync();
    const inputShape = [1, 20, 6];

    // 1) Build full (120,6) raw window
    const raw120 = build120x6Window(rawSequence);

    if (raw120.length !== SAMPLES_PER_SEQ) {
      throw new Error(`Expected 120 samples, got ${raw120.length}`);
    }

    // 2) Filter full 120
    const filtered120 = lowPassSmooth120(raw120);

    // 3) Normalize full 120 with training mean/std
    const normalized120 = normalize120(filtered120);

    // 4) Split into six (20,6) chunks
    const avgResults = [0, 0, 0];
    const modelResults = [];

    for (let i = 0; i < INFERENCE_CHUNKS_PER_SEQ; i++) {
      const start = i * 20;
      const end = start + 20;
      const chunk20 = normalized120.slice(start, end);

      const feeds = {
        imu: new ort.Tensor("float32", flatten20x6(chunk20), inputShape),
      };

      const result = await session.run(feeds);
      const keys = Object.keys(result);
      const first = result[keys[0]];
      modelResults.push(first);
    }

    // console.log({"Before avg": modelResults});
    // Debug 
    const debugDataArr = modelResults.map((result) => {
        return [...result.data]
    });
    console.log({"Before Avg": debugDataArr});

    // 5) Average outputs
    modelResults.forEach((result) => {
      const data: number[] = Array.from(result.data);
      avgResults[0] += data[0];
      avgResults[1] += data[1];
      avgResults[2] += data[2];
    });

    avgResults[0] /= INFERENCE_CHUNKS_PER_SEQ;
    avgResults[1] /= INFERENCE_CHUNKS_PER_SEQ;
    avgResults[2] /= INFERENCE_CHUNKS_PER_SEQ;

    console.log("Prediction:", avgResults);
    DeviceEventEmitter.emit("onNewIMUSequence", avgResults);
  } catch (error) {
    console.error("Inference pipeline failed:", error);
  }
};

// const processAndInferSequence = async (rawSequence: seqPacket[]) => {
//     try {
//         await new Promise(resolve => setTimeout(resolve, 0));
//         const ort = await import("onnxruntime-react-native");

//         // 1. Safely grab the model (will wait if still initializing on app boot)
//         const session = await getOnnxSessionAsync();
//         const inputShape = [1, 20, 6];
//         const flattenSeq:number[] = [];
//         const modelResults = [];
//         const avgResults = [0.0, 0.0, 0.0];

//         // Flattens the raw sequence.
//         rawSequence.forEach(packet => {
//             console.log(packet.packetId);
//             for (let i = 0; i < 6; i++) {
//                 const ax = packet.accelData[i][0] * GRAVITY;
//                 const ay = packet.accelData[i][1] * GRAVITY;
//                 const az = packet.accelData[i][2] * GRAVITY;

//                 const gx = packet.gyroData[i][0] * DEG_TO_RAD;
//                 const gy = -(packet.gyroData[i][1] * DEG_TO_RAD);
//                 const gz = -(packet.gyroData[i][2] * DEG_TO_RAD);

//                 flattenSeq.push(ax, ay, az, gx, gy, gz);
//             }
//         });

//         // Inference is done 6 times per window yup.
//         for (let i = 0; i < 6 ; i++) {
//             const feeds = {
//                 ["imu"] : new ort.Tensor("float32", new Float32Array(flattenSeq.slice( (i * 120), (i + 1) * 120)), inputShape)
//             }
//             const result = await session.run(feeds);
//             const keys = Object.keys(result);
//             const first = result[keys[0]];
//             modelResults.push(first);
//         }

//         modelResults.forEach((result) => {
//             const data:number[] = Array.from(result.data);
//             avgResults[0] += data[0];
//             avgResults[1] += data[1];
//             avgResults[2] += data[2];
//         });

//         avgResults[0] /= 6.0;
//         avgResults[1] /= 6.0;
//         avgResults[2] /= 6.0;
//         console.log("Prediction:", avgResults);
//         DeviceEventEmitter.emit("onNewIMUSequence", avgResults);
//         // 2. Preprocess your rawSequence into a tensor
//         // const tensor = formatForONNX(rawSequence);
        
//         // 3. Run inference!
//         // const results = await session.run(tensor);
        
//         // console.log("Prediction:", results);

//     } catch (error) {
//         console.error("Inference pipeline failed:", error);
//     }
// };

const handleNotification = (event: any) => {
    const readValue: Uint8Array = new Uint8Array(event.value);
    
    const packet = parseBytesIntoSeqPacket(readValue);
    if (packet === null) {
        console.warn("Received data could not be parsed!");
        return;
    }

    const insertedSeq = insertPacketIntoSeq(packet);
    if (insertedSeq < 0) {
        // console.warn("Received packet could not be inserted into sequence");
        triggerAckTimer();
        return;
    }

    triggerAckTimer();

    // printWindow(insertedSeq);

    packets_received++;

    if (packets_received === SEQ_LENGTH) {
        console.log("Sequence complete! Flushing to database...");

        // Pass a copy so the ARQ can immediately start filling the next batch
        const sequenceToSave = [...sequence]; 

        // DeviceEventEmitter.emit("onNewIMUSequence", sequenceToSave);
        processAndInferSequence(sequenceToSave);

        sequence = [];
        packets_received = 0;
        // insertSequence(connectedPeripheral.timeConnnected, sequenceToSave).then(() => {
        //     console.log("Insertion Success");
        // }).catch(() => {
        //     console.error("Failed to insert sequence 😔");
        // }).finally(() => {
        //     // Reset sequence logic
        //     sequence = [];
        //     packets_received = 0;
        // });        
    }
}


export const bleForegroundService = async (taskDataArgs: any) => {
    const { delay } = taskDataArgs;
    BackgroundService;


    console.log("Service started successfully!");
    BleManager.onDiscoverPeripheral(handleDiscoveredPeripheral);
    BleManager.onConnectPeripheral(handleConnectedPeripheral);
    BleManager.onDisconnectPeripheral(handleDiconnectedPeripheral);
    BleManager.onDidUpdateValueForCharacteristic(handleNotification);

    await scanForPeripherals();

    await new Promise<void>(async (resolve) => {
        while (BackgroundService.isRunning()) {
            await sleep(delay); 
        }
        resolve();
    });

    console.log("Stopping...");
}

export const startBackgroundService = async () => {
    if (BackgroundService.isRunning()) {
        return;
    } else {
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                alert("We need notification access to run in the background.");
                return;
            }
        }
        await BackgroundService.start(bleForegroundService, options);
    }
}

export const stopBackgroundService = async () => {
    if (BackgroundService.isRunning()) {
        await BackgroundService.stop();
    }
}

export const options = {
    taskName: 'SensorLogger',
    taskTitle: 'Recording Sensors',
    taskDesc: 'Recording raw data...',
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#ff00ff',
    parameters: { delay: 1000 },
};