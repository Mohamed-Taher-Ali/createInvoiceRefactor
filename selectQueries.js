module.exports = {
    dpsSelectQuery: '_id directOrderId partClass priceBeforeDiscount',
    invocesSelectQuery: 'walletPaymentAmount discountAmount deliveryFees',
    all_psSelectQuery: '_id directOrderId partClass premiumPriceBeforeDiscount',
    directOrderSelectQuery: 'partsIds requestPartsIds discountAmount deliveryFees walletPaymentAmount',
}