import moment from 'moment';

const repeatCustomers = async (req, res) => {
    const db = req.app.locals.db;
    const { period, startDate, endDate } = req.query;

    // Parse dates if provided
    const start = startDate ? moment(startDate).toISOString() : null;
    const end = endDate ? moment(endDate).toISOString() : null;

    // Define the date format and grouping logic based on the period
    let dateFormat, groupId;
    if (period === 'daily') {
        dateFormat = '%Y-%m-%d';
        groupId = { $dateToString: { format: dateFormat, date: '$createdAt' } };
    } else if (period === 'weekly') {
        groupId = { $concat: [{ $dateToString: { format: '%Y-', date: '$createdAt' } }, { $toString: { $isoWeek: '$createdAt' } }] };
    } else if (period === 'monthly') {
        dateFormat = '%Y-%m';
        groupId = { $dateToString: { format: dateFormat, date: '$createdAt' } };
    } else if (period === 'quarterly') {
        groupId = { $concat: [{ $dateToString: { format: '%Y-', date: '$createdAt' } }, 'Q', { $toString: { $add: [{ $divide: [{ $month: '$createdAt' }, 3] }, 1] } }] };
    } else if (period === 'yearly') {
        dateFormat = '%Y';
        groupId = { $dateToString: { format: dateFormat, date: '$createdAt' } };
    } else {
        dateFormat = '%Y-%m';
        groupId = { $dateToString: { format: dateFormat, date: '$createdAt' } };
    }

    const matchStage = {};
    if (start) matchStage.$gte = start;
    if (end) matchStage.$lte = end;

    const pipeline = [
        {
            $addFields: {
                createdAt: { $dateFromString: { dateString: '$created_at' } }
            }
        },
        {
            $match: {
                ...(start || end ? { createdAt: matchStage } : {}),
            }
        },
        {
            $group: {
                _id: groupId,
                uniqueCustomers: { $addToSet: '$email' }
            }
        },
        {
            $addFields: {
                repeatCustomers: { $size: '$uniqueCustomers' }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ];

    const repeatCustomersData = await db.collection('shopifyOrders').aggregate(pipeline).toArray();

    // Calculate Repeat Customers Growth Rate
    let previousPeriodRepeatCustomers = null;

    const formattedResponse = repeatCustomersData.map((item) => {
        const currentPeriodRepeatCustomers = item.repeatCustomers;
        let growthRate = null;

        if (previousPeriodRepeatCustomers !== null) {
            growthRate = ((currentPeriodRepeatCustomers - previousPeriodRepeatCustomers) / previousPeriodRepeatCustomers) * 100;
        }

        previousPeriodRepeatCustomers = currentPeriodRepeatCustomers;

        return {
            period: item._id,
            repeatCustomers: currentPeriodRepeatCustomers,
            growthRate: growthRate !== null ? `${growthRate.toFixed(2)}%` : null
        };
    });

    res.json(formattedResponse);
};

export default repeatCustomers;
