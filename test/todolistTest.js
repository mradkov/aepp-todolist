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
const fs = require('fs');

const config = {
    host: "http://localhost:3001/",
    internalHost: "http://localhost:3001/internal/",
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
            networkId: 'ae_devnet',
            compilerUrl: config.compilerUrl
        });
    });

    it('Deploying TodoList Contract', async () => {
        let contractSource = fs.readFileSync('./contracts/todo-list.aes', "utf-8");
        contract = await owner.getContractInstance(contractSource);
        const deploy = await contract.deploy();
        await assert.equal(deploy.result.returnType, 'ok', 'Could not deploy the Todolist Smart Contract');
    });

    it('TodoList Contract Workflow: Add Todo Item', async () => {
        let call = await contract.methods.add_task('testing');
        await assert.equal(call.result.returnType, 'ok', 'Could not add a task');
    });

    it('TodoList Contract Workflow: Get All Todo Items', async () => {
        let call = await contract.methods.get_tasks();
        let decode = transformTasksList(call.decodedResult);
        await assert.deepEqual(decode[0], {
            id: 0,
            name: 'testing',
            completed: false,
            status: "NoStatus"
        }, 'Could not get tasks');
    });

    it('TodoList Contract Workflow: Complete Todo Items', async () => {
        await contract.methods.set_task_completed(0);
        const callStatic = await contract.methods.get_tasks();
        let decode = transformTasksList(callStatic.decodedResult);
        await assert.deepEqual(decode[0], {
            id: 0,
            name: 'testing',
            completed: true,
            status: "Finished"
        }, 'Could not get tasks');
    });

    it('TodoList Contract Workflow: Set Todo Item Status', async () => {
        await contract.methods.add_task('testing status');

        await contract.methods.set_next_status(1);
        callStatic = await contract.methods.get_tasks();
        decode = transformTasksList(callStatic.decodedResult);
        assert.deepEqual(decode[1], { id: 1, name: 'testing status', completed: false, status: "InProgress" });

        await contract.methods.set_next_status(1);
        callStatic = await contract.methods.get_tasks();
        decode = transformTasksList(callStatic.decodedResult);
        assert.deepEqual(decode[1], { id: 1, name: 'testing status', completed: false, status: "ReadyForReview" });


        await contract.methods.set_next_status(1);
        callStatic = await contract.methods.get_tasks();
        decode = transformTasksList(callStatic.decodedResult);
        assert.deepEqual(decode[1], { id: 1, name: 'testing status', completed: false, status: "ToBeDeployed" });


        await contract.methods.set_next_status(1);
        callStatic = await contract.methods.get_tasks();
        decode = transformTasksList(callStatic.decodedResult);
        assert.deepEqual(decode[1], { id: 1, name: 'testing status', completed: true, status: "Finished" });

        let call = await contract.methods.set_next_status(1).catch(e => e);
        assert.include(call.decodedError, "ALREADY_COMPLETED")
    });

});
