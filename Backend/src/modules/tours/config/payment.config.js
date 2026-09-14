/** Fixed money rules for the tours module. Rates that an admin can change live
 *  in ToursSettings; these are floors and limits the product does not vary. */
export const PaymentConfig = {
  minCommission: 50,
  minWithdrawalAmount: 500,
  maxWithdrawalAmount: 100000,
};

export default PaymentConfig;
