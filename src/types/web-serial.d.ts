interface SerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream;
    writable: WritableStream;
}

interface Serial {
    requestPort(options?: { filters: any[] }): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
}

interface Navigator {
    serial: Serial;
}
