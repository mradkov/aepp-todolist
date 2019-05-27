<template>
  <div>
    <div class="overlay-loader flex justify-center" v-if="!client || showLoading">
      <BiggerLoader></BiggerLoader>
    </div>

    <div id="app-content">
      <h2>æternity Todo List</h2>
      <prism-editor :line-numbers="true" v-model="contractCode" :code="contractCode" language="reason"></prism-editor>
      <ae-button face="round" fill="primary" @click="checkContract" id="check-contract">Check Contract</ae-button>

      <div id="todo-list">
        <ae-list v-for="task in tasks">
          <ae-list-item fill="neutral">
            <div v-if="task.completed" class="completed-task">
              <ae-check v-model="task.completed" disabled/>
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
</template>

<script>
    import 'prismjs'
    import 'prismjs/themes/prism.css'
    import 'prismjs/components/prism-reason.min.js'
    import 'vue-prism-editor/dist/VuePrismEditor.css' // import the styles
    import PrismEditor from 'vue-prism-editor'

    import {Universal} from '@aeternity/aepp-sdk'
    import * as Crypto from '@aeternity/aepp-sdk/es/utils/crypto'
    import {AeButton, AeInput, AeList, AeListItem, AeCheck, mixins} from '@aeternity/aepp-components'
    import {BigNumber} from 'bignumber.js';
    import axios from 'axios';

    import example from 'raw-loader!../../contracts/example.aes';

    import BiggerLoader from './BiggerLoader'

    export default {
        name: 'NameRegistration',
        mixins: [mixins.events],
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
                showLoading: true
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
                alert(message);
            },
            transformTasksList(list) {
                return list.map(([id, task]) => {
                    return {...{id: id}, ...task};
                });
            },
            async setTaskCompleted(id) {
                this.showLoading = true;
                await this.contractInstance.call('set_task_completed', [id]).catch(this.handleContractError);
                const tasksCall = await this.contractInstance.call('get_tasks', [], {callStatic: true}).catch(this.handleContractError);
                this.tasks = await tasksCall.decode().then(this.transformTasksList).catch(this.handleContractError);
                this.showLoading = false;
            },
            async checkContract() {
                this.showLoading = true;
                this.contractInstance = await this.client.getContractInstance(this.contractCode).catch(this.handleContractError);
                await this.contractInstance.deploy().catch(this.handleContractError);
                await this.contractInstance.call('add_task', ['Allow contract to add tasks'])
                    .then(async () => {
                        await this.contractInstance.call('add_task', ['Allow contract to complete tasks']);
                        await this.contractInstance.call('set_task_completed', [1]).catch(this.handleContractError);
                    })
                    .catch(this.handleContractError);

                const tasksCall = await this.contractInstance.call('get_tasks', [], {callStatic: true}).catch(this.handleContractError);
                this.tasks = await tasksCall.decode().then(this.transformTasksList).catch(this.handleContractError);
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
    padding: 0 20px 20px;
  }

  #check-contract {
    margin-top: 10px;
  }

  #todo-list {
    margin-top: 10px;
  }

  .completed-task {
    text-decoration: line-through;
  }

  .overlay-loader {
    z-index: 100;
    width: 100vw;
    height: 100vh;
    position: absolute;
    background-color: rgba(255, 255, 255, 0.7);
    overflow: hidden;
  }
</style>
