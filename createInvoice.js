const
    {
        dpsSelectQuery,
        all_psSelectQuery,
        invocesSelectQuery,
        directOrderSelectQuery
    } = require('./selectQueries'),

    Helpers = require('speero-backend/helpers'),
    Part = require('speero-backend/modules/parts'),
    Invoice = require('speero-backend/modules/invoices'),
    DirectOrder = require('speero-backend/modules/direct.orders'),
    DirectOrderPart = require('speero-backend/modules/direct.order.parts');


module.exports.createInvoice = async (createDate) => {
    try {

        const dps = await DirectOrderPart.Model
        .find(dpsQuery(createDate))
        .select(dpsSelectQuery);


        const all_ps = await Part.Model
        .find(all_psQuery(createDate))
        .select(all_psSelectQuery);


        const
            invcs = [],
            allParts = all_ps.concat(dps),
            directOrderPartsGroups = Helpers.groupBy(allParts, 'directOrderId');

        for (const allDirectOrderParts of directOrderPartsGroups) {

            const directOrder = await DirectOrder.Model
                .findOne({ _id: allDirectOrderParts[0].directOrderId })
                .select(directOrderSelectQuery);

            const invoces = await Invoice.Model
                .find({ directOrderId: allDirectOrderParts[0].directOrderId })
                .select(invocesSelectQuery);

            const directOrderParts = allDirectOrderParts.filter(directOrderPart =>
                directOrderPart.partClass === 'StockPart' ||
                directOrderPart.partClass === 'QuotaPart'
            );

            const
                requestParts = allDirectOrderParts.filter(part => part.partClass === 'requestPart'),
                dpsprice = directOrderParts.reduce((sum, part) => sum + part.priceBeforeDiscount, 0),
                rpsprice = requestParts.reduce((sum, part) => sum + part.premiumPriceBeforeDiscount, 0),
                dpsId = directOrderParts.map(part => part._id),
                rpsId = requestParts.map(part => part._id),
                TotalPrice = Helpers.Numbers.toFixedNumber(rpsprice + dpsprice),
                { deliveryFees } = directOrder;

            let
                { walletPaymentAmount, discountAmount } = directOrder,
                totalAmount = TotalPrice;

            if (directOrder.deliveryFees && invoces.length === 0)
                totalAmount += directOrder.deliveryFees;

            if (walletPaymentAmount) {
                invoces.map(invoice => {
                    walletPaymentAmount = Math.min(0,
                        walletPaymentAmount - invoice.walletPaymentAmount
                    );
                });

                walletPaymentAmount = Math.min(walletPaymentAmount, totalAmount);
                totalAmount -= walletPaymentAmount;
            }

            if (discountAmount) {
                invoces.map(invoice => {
                    discountAmount = Math.min(0, discountAmount - invoice.discountAmount);
                });
                
                discountAmount = Math.min(discountAmount, totalAmount);
                totalAmount -= discountAmount;
            }

            if (totalAmount < 0)
                throw Error(`Could not create invoice for directOrder: ${directOrder._id} with totalAmount: ${totalAmount}. `);

            const invoice = await Invoice.Model.create({
                directOrderId: directOrder._id,
                totalPartsAmount: TotalPrice,
                directOrderPartsIds: dpsId,
                requestPartsIds: rpsId,
                walletPaymentAmount,
                discountAmount,
                deliveryFees,
                totalAmount,
            });

            let invoiceId = invoice._id;

            await DirectOrder.Model.updateOne({ _id: directOrder._id },
                { $addToSet: { invoicesIds: invoiceId } }
            );

            for (const dpId of dpsId)
                await DirectOrderPart.Model.updateOne({ _id: dpId },
                    { invoiceId: invoiceId }
                );

            try {
                await Promise.all(rpsId.map(async rpId => (

                    await Part.Model.updateOne({ _id: rpId },
                        { invoiceId: invoiceId }
                    )
                ))
                )
            } catch (e) { }

            invcs.push(invoiceId);
        }

        return {
            case: 1,
            invoicesIds: invcs,
            message: 'invoices created successfully.',
        };

    } catch (err) {
        Helpers.reportError(err);
    }
};
