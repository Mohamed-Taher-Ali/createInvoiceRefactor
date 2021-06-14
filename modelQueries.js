module.exports = {
    dpsQuery: (createDate) => ({
        invoiceId: { $exists: false },
        createdAt: { $gt: new Date(createDate) },
        fulfillmentCompletedAt: { $exists: true },
    }),
    
    all_psQuery: (createDate) => ({
        partClass: 'requestPart',
        pricedAt: { $exists: true },
        invoiceId: { $exists: false },
        directOrderId: { $exists: true },
        createdAt: { $gt: new Date(createDate) },
    }),
}