import express from "express";


const router = express.Router();

import totalsales from "../components/totalSales.js";
import newCustomers from "../components/newCustomers.js";
import repeatCustomers from "../components/repeatCustomers.js";
import geographCustomers from "../components/geographCustomers.js";
import customersCohorts from "../components/customersCohart.js";


router.get("/test", (req, res) => {

    res.json({msg: "Server is up and running"});
})

router.get("/totalsales", totalsales);
router.get("/newcustomers", newCustomers);

router.get("/repeatcustomers", repeatCustomers);

router.get("/geographcustomers", geographCustomers);

router.get("/customerscohorts", customersCohorts);



export default router