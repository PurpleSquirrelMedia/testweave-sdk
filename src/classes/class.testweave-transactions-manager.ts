import Arweave from 'arweave';
import Transaction from 'arweave/node/lib/transaction';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import ITestWeaveTransactionsManager from '../interfaces/interface.testweave-transactions-manager';

export default class TestWeaveTransactionsManager implements ITestWeaveTransactionsManager {
  private _arweave: Arweave;

  /**
   * The constructor of the class. Should never be called directly, since this
   * is a static class.
   * @param arweaveInstance an arweave instance.
   */
  private constructor(arweaveInstance: Arweave, transactionsPool: Array<string>) {
    this._arweave = arweaveInstance;
  }

  /**
   * Private constructor that creates the TransactionManager Instance
   * @param arweaveInstance the Arweave instance
   */
  public static async init(arweaveInstance: Arweave): Promise<TestWeaveTransactionsManager> {
    const readyForMiningTxs: Array<string> = (await arweaveInstance.api.get('tx/ready_for_mining')).data;
    return new TestWeaveTransactionsManager(arweaveInstance, readyForMiningTxs);
  }

  /**
   * Resolve the transactions pool
   * @param minedTransactions
   */
  public async resolvePool(): Promise<Array<string>> {
    // get the transaction pool
    const readyForMiningTxs: Array<string> = (await this._arweave.api.get('tx/ready_for_mining')).data;

    // if the pool contain transactions mine them
    if (readyForMiningTxs.length) {
      await this._arweave.api.post('mine', '');
    }

    // check that all the transactions that were in the pool have status 200
    for (const txID of (await this._arweave.api.get('tx/ready_for_mining')).data) {
      while ((await this._arweave.transactions.getStatus(txID)).status !== 200) {
        false;
      }
    }
    return readyForMiningTxs;
  }

  /**
   * This is a post method that is intended to replace the arwwave.api post one.
   * It does the same things of the arweave.api one, but it pull the internal transactions pool too.
   * @param endpoint the endpoint that must be called
   * @param body the Body of the post request
   * @param config the optional configurations that must be sent along the post request
   */
  public async getPost(
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    body: Buffer | string | object,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    try {
      const response = await this._arweave.api.request().post(endpoint, body, config);
      if (endpoint === 'tx') {
        const { id } = body as Transaction;
        // check if the transaction is already in the ready_for_mining pool. If not await for that before returning;
        // const transactionPool: Array<string> = (await this._arweave.api.get('tx/ready_for_mining')).data
        while (!(await this._arweave.api.get('tx/ready_for_mining')).data.includes(id)) {
          false;
        }
      }
      return response;
    } catch (error) {
      if (error.response && error.response.status) {
        return error.response;
      }

      throw error;
    }
  }
}
