/* istanbul ignore file */
/* eslint-disable */

import {Events} from "../..";
import {LoggerStub} from "../../../controller/logger-stub";
import {Backup} from "../../../models";
import {BackupUtils, Waitress} from "../../../utils";
import {FrameType, Direction, ZclFrame} from "../../../zcl";
import Adapter from "../../adapter";
import {ZclDataPayload} from "../../events";
import {StartResult, Coordinator, CoordinatorVersion, NetworkParameters, LQI, RoutingTable, NodeDescriptor, ActiveEndpoints, SimpleDescriptor, NetworkOptions, SerialPortOptions, AdapterOptions} from "../../tstype";

interface WaitressMatcher {
    address: number | string;
    endpoint: number;
    transactionSequenceNumber?: number;
    frameType: FrameType;
    clusterID: number;
    commandIdentifier: number;
    direction: number;
};


class SimAdapter extends Adapter {
    private waitress: Waitress<Events.ZclDataPayload, WaitressMatcher>;
    
    public constructor(networkOptions: NetworkOptions,
        serialPortOptions: SerialPortOptions, backupPath: string, adapterOptions: AdapterOptions, logger?: LoggerStub) {

        super(networkOptions, serialPortOptions, backupPath, adapterOptions, logger);

        const concurrent = this.adapterOptions && this.adapterOptions.concurrent ?
            this.adapterOptions.concurrent : 2;

        // TODO: https://github.com/Koenkk/zigbee2mqtt/issues/4884#issuecomment-728903121
        const delay = this.adapterOptions && typeof this.adapterOptions.delay === 'number' ?
            this.adapterOptions.delay : 0;

        this.waitress = new Waitress<Events.ZclDataPayload, WaitressMatcher>(
            this.waitressValidator, this.waitressTimeoutFormatter
        );

    }
    public async start(): Promise<StartResult> {
        return "resumed";
    }
    public async stop(): Promise<void> {
    }
    public async getCoordinator(): Promise<Coordinator> {
        const ieeeAddr: any = 1;
        const nwkAddr: any = 1;

        const endpoints: any = [{
                ID: 0x01,
                profileID: 0x0104,
                deviceID: 0x0005,
                inputClusters: [0x0000, 0x000A, 0x0019],
                outputClusters: [0x0001, 0x0020, 0x0500]
            },
            {
                ID: 0xF2,
                profileID: 0xA1E0,
                deviceID: 0x0064,
                inputClusters: [],
                outputClusters: [0x0021]
            }];

        return {
            networkAddress: nwkAddr,
            manufacturerID: 0x1135,
            ieeeAddr: ieeeAddr,
            endpoints,
        };
    }
    public async getCoordinatorVersion(): Promise<CoordinatorVersion> {
        const type: string ="ConBee2/RaspBee2";
        const meta = {"transportrev":0, "product":0, "majorrel": 1, "minorrel": 0, "maintrel":0, "revision":"sim"};
        return {type: type, meta: meta};
    }
    public async reset(type: 'soft' | 'hard'): Promise<void> {
        return Promise.reject(new Error('Reset is not supported'));
    }

    public async supportsBackup(): Promise<boolean> {
        return false;
    }
    public async backup(): Promise<Backup> {
        return null;
    }
    public async getNetworkParameters(): Promise<NetworkParameters> {
        return {panID:1,extendedPanID:1,channel:1};
    }
    public async setTransmitPower(value: number): Promise<void> {
    }
    public async addInstallCode(ieeeAddress: string, key: Buffer): Promise<void> {
        return Promise.reject(new Error('Add install code is not supported'));
    }
    public async permitJoin(seconds: number, networkAddress: number): Promise<void> {
    }
    public async lqi(networkAddress: number): Promise<LQI> {
        return {neighbors:[]};
    }
    public async routingTable(networkAddress: number): Promise<RoutingTable> {
        return {table: []};
    }
    public async nodeDescriptor(networkAddress: number): Promise<NodeDescriptor> {
        return {type:"Coordinator", manufacturerCode:1};
    }
    public async activeEndpoints(networkAddress: number): Promise<ActiveEndpoints> {
        return {endpoints:[]};
    }
    public async simpleDescriptor(networkAddress: number, endpointID: number): Promise<SimpleDescriptor> {
        return {deviceID:1,endpointID:1,inputClusters:[],outputClusters:[],profileID:1};
    }
    public async bind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: "endpoint" | "group", destinationEndpoint?: number): Promise<void> {
    }
    public async unbind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: "endpoint" | "group", destinationEndpoint: number): Promise<void> {
    }
    public async removeDevice(networkAddress: number, ieeeAddr: string): Promise<void> {
    }
    public async sendZclFrameToEndpoint(ieeeAddr: string, networkAddress: number, endpoint: number, zclFrame: ZclFrame, timeout: number, disableResponse: boolean, disableRecovery: boolean, sourceEndpoint?: number): Promise<ZclDataPayload> {
        return {address:ieeeAddr,endpoint:endpoint,frame:zclFrame,linkquality:100,groupID:1,wasBroadcast:false,destinationEndpoint:endpoint};
    }
    public async sendZclFrameToGroup(groupID: number, zclFrame: ZclFrame, sourceEndpoint?: number): Promise<void> {
    }
    public async sendZclFrameToAll(endpoint: number, zclFrame: ZclFrame, sourceEndpoint: number): Promise<void> {
    }
    public  async setChannelInterPAN(channel: number): Promise<void> {
    }
    public async sendZclFrameInterPANToIeeeAddr(zclFrame: ZclFrame, ieeeAddress: string): Promise<void> {
    }
    public async sendZclFrameInterPANBroadcast(zclFrame: ZclFrame, timeout: number): Promise<ZclDataPayload> {
        return {address:1,endpoint:1,frame:zclFrame,linkquality:100,groupID:1,wasBroadcast:false,destinationEndpoint:1};
    }
    public  async restoreChannelInterPAN(): Promise<void> {
    }
    public static async autoDetectPath(): Promise<string> {
        return null;
    }
    public static async isValidPath(path: string): Promise<boolean> {
        return path === "sim";
    }

    public waitFor(networkAddress: number, endpoint: number, frameType: FrameType, direction: Direction, transactionSequenceNumber: number, clusterID: number, commandIdentifier: number, timeout: number): {promise: Promise<ZclDataPayload>; cancel: () => void;} {
        const payload = {
            address: networkAddress, endpoint, clusterID, commandIdentifier, frameType, direction,
            transactionSequenceNumber,
        };
        const waiter = this.waitress.waitFor(payload, timeout);
        const cancel = (): void => this.waitress.remove(waiter.ID);
        return {promise: waiter.start().promise, cancel};
    }

    private waitressTimeoutFormatter(matcher: WaitressMatcher, timeout: number): string {
        return `Timeout - ${matcher.address} - ${matcher.endpoint}` +
            ` - ${matcher.transactionSequenceNumber} - ${matcher.clusterID}` +
            ` - ${matcher.commandIdentifier} after ${timeout}ms`;
    }

    private waitressValidator(payload: Events.ZclDataPayload, matcher: WaitressMatcher): boolean {
        const transactionSequenceNumber = payload.frame.Header.transactionSequenceNumber;
        return (!matcher.address || payload.address === matcher.address) &&
            payload.endpoint === matcher.endpoint &&
            (!matcher.transactionSequenceNumber || transactionSequenceNumber === matcher.transactionSequenceNumber) &&
            payload.frame.Cluster.ID === matcher.clusterID &&
            matcher.frameType === payload.frame.Header.frameControl.frameType &&
            matcher.commandIdentifier === payload.frame.Header.commandIdentifier &&
            matcher.direction === payload.frame.Header.frameControl.direction;
    }
}


export default SimAdapter;
