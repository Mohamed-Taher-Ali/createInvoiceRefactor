const
    { createInvoice } = require('./createInvoice'),
    startCronJob = require('speero-backend/helpers/start.cron.job');

    
// at 00:00 every day
startCronJob('*/1 * * * *', async () => {
    await createInvoice('2021-04-01');
}, true);
