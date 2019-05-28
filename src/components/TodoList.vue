<template>
  <div>
    <div>
      <div class="overlay-loader" v-show="!client || showLoading">
        <BiggerLoader></BiggerLoader>
      </div>
    </div>
    <div id="app-content">
      <h2>æternity Todo List</h2>
      <div class="container">
        <div class="editor">
          <prism-editor :line-numbers="true" v-model="contractCode" :code="contractCode" language="reason"></prism-editor>
          <div class="errors">
            <div v-for="error in allErrors">
              {{error}}
            </div>
          </div>

          <ae-button face="round" fill="primary" @click="checkContract" id="check-contract">Check Contract</ae-button>
        </div>
        <div class="todo-list">
          <div v-if="functionAddTaskExists" id="add-todo">
            <ae-input v-model="addTodoText"></ae-input>
            <ae-button face="round" fill="primary" @click="addTodo" id="add-todo-button">Add Todo</ae-button>
          </div>
          <ae-list v-for="task in tasks" :key="task.id">
            <ae-list-item fill="neutral">
              <div v-if="task.completed" class="completed-task">
                <ae-check v-model="task.completed" v-bind:key="task.id" disabled/>
                {{task.name}}
              </div>
              <div v-else>
                <ae-check v-model="task.completed" @change="setTaskCompleted(task.id)"/>
                {{task.name}}
              </div>
            </ae-list-item>
          </ae-list>
        </div>
      </div>
      </div>

  </div>
</template>

<script>
    import 'prismjs'
    import 'prismjs/themes/prism.css'
    import 'prismjs/components/prism-reason.min.js'
    import 'vue-prism-editor/dist/VuePrismEditor.css' // import the styles
    import PrismEditor from 'vue-prism-editor'

    import {Universal} from '@aeternity/aepp-sdk'
    import * as Crypto from '@aeternity/aepp-sdk/es/utils/crypto'
    import {AeButton, AeInput, AeList, AeListItem, AeCheck} from '@aeternity/aepp-components'
    import {BigNumber} from 'bignumber.js';
    import axios from 'axios';

    import example from 'raw-loader!../../contracts/example.aes';

    import BiggerLoader from './BiggerLoader'

    export default {
        name: 'TodoList',
        components: {
            AeInput,
            AeButton,
            AeList,
            AeListItem,
            AeCheck,
            PrismEditor,
            BiggerLoader
        },
        data() {
            return {
                contractCode: example,
                contractInstance: null,
                address: null,
                client: null,
                tasks: [],
                showLoading: true,
                functionAddTaskExists: false,
                addTodoText: "",
                allErrors: []
            }
        },
        methods: {
            atomsToAe(atoms) {
                return (new BigNumber(atoms)).dividedBy(new BigNumber('1e18'));
            },
            getKeypair() {
                let keypairString = localStorage.getItem('testnet-keypair');
                let keypair = keypairString ? JSON.parse(keypairString) : Crypto.generateKeyPair();
                localStorage.setItem('testnet-keypair', JSON.stringify(keypair));
                return keypair;
            },
            handleContractError(message) {
                this.showLoading = false;
                this.allErrors.push(message);
                //alert(message);
            },
            transformTasksList(list) {
                return list.map(([id, task]) => {
                    return {...{id: id}, ...task};
                });
            },
            async addTodo() {
                if (this.addTodoText !== "") {
                    this.showLoading = true;
                    await this.contractInstance.call('add_task', [this.addTodoText]).catch(this.handleContractError);
                    const tasksCall = await this.contractInstance.call('get_tasks', [], {callStatic: true}).catch(this.handleContractError);
                    this.tasks = await tasksCall.decode().then(this.transformTasksList).catch(this.handleContractError);
                    this.addTodoText = "";
                    this.showLoading = false;
                }
            },
            async setTaskCompleted(id) {
                this.showLoading = true;
                await this.contractInstance.call('set_task_completed', [id]).catch(this.handleContractError);
                const tasksCall = await this.contractInstance.call('get_tasks', [], {callStatic: true}).catch(this.handleContractError);
                this.tasks = await tasksCall.decode().then(this.transformTasksList).catch(this.handleContractError);
                this.showLoading = false;
            },
            //its hacky and I know it
            async checkContract() {
                this.allErrors = []
                this.showLoading = true;
                this.contractInstance = await this.client.getContractInstance(this.contractCode).catch(this.handleContractError);
                await this.contractInstance.deploy().catch(this.handleContractError);

                await this.contractInstance.call('get_tasks', [], {callStatic: true}).then(async () => {
                    await this.contractInstance.call('add_task', ['Allow contract to add tasks'])
                        .then(async () => {
                            this.functionAddTaskExists = true;
                            await this.contractInstance.call('add_task', ['Allow contract to complete tasks']);
                            await this.contractInstance.call('set_task_completed', [1]).catch(this.handleContractError);
                            const tasksCall = await this.contractInstance.call('get_tasks', [], {callStatic: true}).catch(this.handleContractError);
                            this.tasks = await tasksCall.decode().then(this.transformTasksList).catch(this.handleContractError);
                        })
                        .catch(this.handleContractError);
                }).catch(this.handleContractError);
                this.showLoading = false;
            }
        },
        async created() {
            const keypair = this.getKeypair();
            this.client = await Universal({
                url: "https://sdk-testnet.aepps.com/",
                internalUrl: "https://sdk-testnet.aepps.com/",
                keypair: keypair,
                nativeMode: true,
                networkId: 'ae_uat',
                compilerUrl: "https://compiler.aepps.com"
            });

            this.address = await this.client.address();
            const balance = await this.client.balance(this.address, {format: false}).then(this.atomsToAe).catch(() => 0);
            if (balance <= 5) {
                await axios.post(`https://testnet.faucet.aepps.com/account/${this.address}`, {}, {headers: {'content-type': 'application/x-www-form-urlencoded'}})
            }
            this.showLoading = false;
        },
    }
</script>

<style>
  #app-content {
    max-width: 1200px;
    padding: 0 20px 20px;
  }

  #check-contract {
    margin-top: 10px;
  }

  .todo-list {
    margin-top: 2rem;
  }

  .editor {
    display: block;
    max-width: 100vw;
  }

  #add-todo {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 1rem;
  }

  #add-todo-button {
    min-width: 170px;
    margin-left: 10px;
  }

  .completed-task {
    text-decoration: line-through;
  }

  .errors div {
      padding: 0.5rem 1rem;
      background: rgba(255, 0, 0, 0.6);
      color: white;
      margin: 1rem 0;
      display: flex;
      align-items: center;
      text-align: left;
  }

  .errors div::before {
      content: "!";
      font-size: 2rem;
      font-weight: bold;
      margin-right: 1rem;
  }

  .overlay-loader {
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 100;
    width: 100%;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 150px;
    background-color: rgba(255, 255, 255, 0.7);
    overflow: hidden;
  }

  input.ae-input {
      box-sizing: border-box;
  }

  .ae-check-button::after {
      top: 2px !important;
      left: 7px !important;
      background-size: 1rem !important;
  }
</style>
