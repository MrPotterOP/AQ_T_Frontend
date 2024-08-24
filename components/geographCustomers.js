const geographicalDistribution = async (req, res) => {
    const db = req.app.locals.db;

    // Define aggregation pipeline
    const pipeline = [
        {
            $match: {
                'default_address.city': { $exists: true }
            }
        },
        {
            $group: {
                _id: "$default_address.city",
                numberOfCustomers: { $sum: 1 }
            }
        },
        {
            $sort: {
                numberOfCustomers: -1
            }
        }
    ];

    // Execute aggregation pipeline
    const results = await db.collection('shopifyCustomers').aggregate(pipeline).toArray();

    // Format response
    const formattedResponse = results.map(result => ({
        city: result._id,
        numberOfCustomers: result.numberOfCustomers
    }));

    res.json({ geographicalDistribution: formattedResponse });
};

export default geographicalDistribution;
