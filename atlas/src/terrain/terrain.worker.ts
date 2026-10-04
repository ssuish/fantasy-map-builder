import { executeTerrainJob, resultTransfers } from "./worker-kernel";
import type { WorkerRequest, WorkerResponse } from "./protocol";

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<WorkerRequest>) => void;
  postMessage(response: WorkerResponse, transfer: Transferable[]): void;
};

scope.onmessage = ({ data }) => {
  const response = executeTerrainJob(data);
  scope.postMessage(response, resultTransfers(response));
};
