import type * as Electron from "electron";
import type * as Stream from "stream";

import * as proxyTransport from "../../proxy16/transports.js";

const proxified = proxyTransport();

const getRequestId = () => {
    const rand = Math.random()

    const min = 0x100000;
    const max = 0xFFFFFF - min;

    const randHex = Math.floor(rand * max + min).toString(16);
    const dateHex = Date.now().toString(16);

    return randHex + dateHex;
}

export function proxifiedFetchFactory(electronIpcRenderer: Electron.IpcRenderer) {
    const defaultInit = {
        method: 'GET',
    };

    async function profixiedFetch(input: RequestInfo, init: RequestInit = defaultInit): Promise<Response> {
        console.log('PROXIFIED FETCH TO', input, init);

        const preparedInit: RequestInit = {};

        preparedInit.headers = {};

        if (input instanceof Request) {
            input.headers.forEach((value, name) => {
                preparedInit.headers[name] = value;
            });

            throw Error('Bastyon Proxified Fetch does not support Request objects');
        }

        if (init.method) {
            preparedInit.method = init.method;
        }

        if (init.headers && !(init.headers instanceof Headers)) {
            preparedInit.headers = init.headers;
        }

        if (init.body) {
            if (typeof init.body !== 'string') {
                throw Error('Bastyon Proxified Fetch does support only String Body');
            }

            preparedInit.body = init.body;
        }

        const id = getRequestId();
        const url = input;
        let fetchCancel: AbortSignal;

        if (init.signal) {
            fetchCancel = init.signal;
        }

        if (init.headers instanceof Headers) {
            init.headers.forEach((value, name) => {
                preparedInit.headers[name] = value;
            });
        }

        return new Promise((resolve, reject) => {
            const readStream = new ReadableStream({
                async start(controller) {
                    let closed = false;

                    if (fetchCancel) {
                        fetchCancel.onabort = () => {
                            electronIpcRenderer.removeAllListeners(`ProxifiedFetch : InitialData[${id}]`);
                            electronIpcRenderer.removeAllListeners(`ProxifiedFetch : PartialResponse[${id}]`);

                            if (!closed) {
                                electronIpcRenderer.send('ProxifiedFetch : Abort', id);

                                controller.close();
                                closed = true;
                            }
                        };
                    }

                    electronIpcRenderer.once(`ProxifiedFetch : Closed[${id}]`, (event) => {
                        electronIpcRenderer.removeAllListeners(`ProxifiedFetch : InitialData[${id}]`);
                        electronIpcRenderer.removeAllListeners(`ProxifiedFetch : PartialResponse[${id}]`);

                        if (!closed) {
                            controller.close();
                            closed = true;
                        }
                    });

                    electronIpcRenderer.once(`ProxifiedFetch : Error[${id}]`, (event) => {
                        if (!closed) {
                            controller.error('PROXIFIED_FETCH_ERROR');
                            closed = true;

                            const err = new TypeError('Failed to fetch');
                            reject(err);
                        }
                    });

                    electronIpcRenderer.on(`ProxifiedFetch : PartialResponse[${id}]`, (event, data: Uint8Array) => {
                        /**
                         * FIXME:
                         *  Strange issue found. Somewhere Uint8Array.buffer was replaced
                         *  what produces invalid data in ArrayBuffer analog of object.
                         *  Must not be trusted, so using destructuring to get the
                         *  correct one buffer.
                         */
                        // @ts-ignore
                        data = new Uint8Array([...data]);

                        const chunkUint8 = new Uint8Array(data.buffer);
                        controller.enqueue(chunkUint8);

                        electronIpcRenderer.send(`ProxifiedFetch : ReceivedResponse[${id}]`);
                    });
                }
            });

            electronIpcRenderer.on(`ProxifiedFetch : InitialData[${id}]`, (event, initialData) => {
                const response = new Response(readStream, initialData);

                Object.defineProperty(response, 'url', { value: url });

                const responseData = { url: response.url };

                response.headers.forEach((value, name) => {
                    responseData[name] = value;
                });

                console.table(responseData);
                console.log(response);

                resolve(response);
            });

            try {
                electronIpcRenderer.send('ProxifiedFetch : Request', id, url, preparedInit);
            } catch (e) {
                throw Error('ProxifiedFetch : Request -  sent invalid data');
            }
        });
    }

    return (input: RequestInfo, init?: RequestInit) => profixiedFetch(input, init);
}

export function initProxifiedFetchBridge(electronIpcMain: Electron.IpcMain) {
    const requests = {};

    electronIpcMain.on('ProxifiedFetch : Request', (event, id: string, url: string, requestInit: RequestInit) => {
        const sender = event.sender;
        const fetch = proxified.fetch;

        requests[id] = {};

        const controller = new AbortController();
        const signal = controller.signal;

        const request = fetch(url, { signal, ...requestInit })
            .then((data: Response & { body: Stream }) => {
                const { status } = data;

                const headers = {};

                data.headers.forEach((value, name) => {
                    headers[name] = value;
                });

                sender.send(`ProxifiedFetch : InitialData[${id}]`, { status, headers });

                data.body.on('data', (chunk) => {
                    sender.send(`ProxifiedFetch : PartialResponse[${id}]`, chunk);
                });

                data.body.on('end', () => {
                    sender.send(`ProxifiedFetch : Closed[${id}]`);
                });
            })
            .catch((err) => {
                if (err.code !== 'FETCH_ABORTED') {
                    // console.log('Proxified Fetch failed with next error:', err);
                    sender.send(`ProxifiedFetch : Error[${id}]`);
                }
            });

        requests[id] = { request, cancel: () => controller.abort() };
    });

    electronIpcMain.on('ProxifiedFetch : Abort', (e, id) => {
        const request = requests[id];

        if (!request || !request.cancel) {
            return;
        }

        request.cancel();
    });
}
