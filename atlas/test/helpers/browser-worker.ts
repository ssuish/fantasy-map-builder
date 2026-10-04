import type { WorkerRequest } from "../../src/terrain/protocol";

export class BrowserWorker extends EventTarget {
  requests: WorkerRequest[] = [];
  terminated = false;

  postMessage(
    message: WorkerRequest,
    options?: Transferable[] | StructuredSerializeOptions,
  ) {
    const transfer = Array.isArray(options) ? options : options?.transfer;
    this.requests.push(structuredClone(message, { transfer }));
  }

  terminate() {
    this.terminated = true;
  }

  reply(data: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}
