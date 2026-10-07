import { hotelApi, toQuery } from './api';

/* Port of Frontend/src/modules/Hotel/services/walletService.js. */

class WalletService {
  /** Get wallet balance and details */
  async getWallet(params = {}) {
    const response = await hotelApi.get('/wallet', { params });
    return response.data;
  }

  /** Get wallet statistics */
  async getWalletStats(params = {}) {
    const response = await hotelApi.get('/wallet/stats', { params });
    return response.data;
  }

  /** Get transaction history */
  async getTransactions(params = {}) {
    const response = await hotelApi.get('/wallet/transactions', { params });
    return response.data;
  }

  /** Request withdrawal */
  async requestWithdrawal(amount) {
    const response = await hotelApi.post('/wallet/withdraw', { amount });
    return response.data;
  }

  /** Get withdrawal history */
  async getWithdrawals(params = {}) {
    const { page = 1, limit = 20, status } = params;
    const response = await hotelApi.get(`/wallet/withdrawals${toQuery({ page, limit, ...(status && { status }) })}`);
    return response.data;
  }

  /** Update bank details */
  async updateBankDetails(bankDetails) {
    const response = await hotelApi.put('/wallet/bank-details', bankDetails);
    return response.data;
  }

  /** Delete bank details */
  async deleteBankDetails() {
    const response = await hotelApi.delete('/wallet/bank-details');
    return response.data;
  }

  /** Create Add Money Order */
  async addMoney(amount) {
    const response = await hotelApi.post('/wallet/add-money', { amount });
    return response.data;
  }

  /** Verify Add Money Payment */
  async verifyAddMoney(paymentData) {
    const response = await hotelApi.post('/wallet/verify-add-money', paymentData);
    return response.data;
  }

  /** Format amount to INR currency */
  formatAmount(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

export default new WalletService();
