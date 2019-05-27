/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */
const Ae = require('@aeternity/aepp-sdk').Universal;

const config = {
    host: "http://localhost:3001/",
    internalHost: "http://localhost:3001/internal/",
    gas: 200000,
    ttl: 55,
    compilerUrl: 'http://localhost:3080'
};

const transformTasksList = (list) => list.map(([id, task]) => {
    return {...{id: id}, ...task};
});

describe('Todolist Contract', () => {

    let owner, contract;

    before(async () => {
        const ownerKeyPair = wallets[0];
        owner = await Ae({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: ownerKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet',
            compilerUrl: config.compilerUrl
        });
    });

    it('Deploying TodoList Contract', async () => {
        let contractSource = utils.readFileRelative('./contracts/todo-list.aes', "utf-8");

        contract = await owner.getContractInstance(contractSource);
        const deploy = await contract.deploy();

        await assert.equal(deploy.deployInfo.result.returnType, 'ok', 'Could not deploy the Todolist Smart Contract');
    });

    it('TodoList Contract Workflow: Add Todo Item', async () => {
        let call = await contract.call('add_task', ['testing']);
        await assert.equal(call.result.returnType, 'ok', 'Could not add a task');
    });

    it('TodoList Contract Workflow: Get All Todo Items', async () => {
        let call = await contract.call('get_tasks', [], {callStatic: true});
        let decode = await call.decode().then(transformTasksList);
        await assert.deepEqual(decode[0], {
            id: 0,
            name: 'testing',
            completed: false,
            status: undefined
        }, 'Could not get tasks');
    });

    it('TodoList Contract Workflow: Complete Todo Items', async () => {
        await contract.call('set_task_completed', [0]);
        let callStatic = await contract.call('get_tasks', [], {callStatic: true});
        let decode = await callStatic.decode().then(transformTasksList);
        await assert.deepEqual(decode[0], {
            id: 0,
            name: 'testing',
            completed: true,
            status: undefined
        }, 'Could not get tasks');
    });

    it('TodoList Contract Workflow: Set Todo Item Status', async () => {
        await contract.call('add_task', ['testing status']);
        let call = await contract.call('set_task_status', [1, "InProgress"]);
        await assert.equal(call.result.returnType, 'ok', 'Could not set task status');

        let callStatic = await contract.call('get_tasks', [], {callStatic: true});
        let decode = await callStatic.decode().then(transformTasksList);
        await assert.deepEqual(decode[1], {
            id: 1,
            name: 'testing status',
            completed: false,
            status: "InProgress"
        }, 'Could not get tasks');
    });

});
