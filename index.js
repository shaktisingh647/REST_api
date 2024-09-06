const express = require('express');
const mongoose = require('mongoose');
const MONGO_URL = 'mongodb://localhost:27017/emi-calci-api';
const app = express();
const PORT=3000;
app.use(express.json());



// connecting to mongodb
mongoose.connect(MONGO_URL).then(()=>{
    console.log("connected to Database")
}).catch((err)=>{
    console.error("error ",err);
})

// definingg the scheme here
const loanSchema = new mongoose.Schema({
    principal : {type:Number , required: true},
    rate: {type:Number,required:true},
    prepayment:{type:Number,default:0},
    tenure:{type:Number , required:true},
    emi:{type:Number},
});

const Loan = mongoose.model('Loan' , loanSchema);

// creating calculation function 
const calculateEmi = (principal,rate,tenure)=>{
    const monthlyRate = rate/ (12*100);
    const emi = (principal*monthlyRate *Math.pow(1+monthlyRate,tenure))/(Math.pow(1+monthlyRate,tenure)-1);
    return emi;
}
// post request api
app.post("/api/calculate-emi",async (req,res)=>{
    const {principal,rate,tenure,prepayment=0} = req.body;

    // checking valid inputs
    if(!principal || !rate || !tenure)
    {
        return res.status(400).json({message:"principal,rate and tenure are required"});
    }

    // remaining principal excluding prepayment
    const remainingPrincipal = principal-prepayment;

    // calculating emi
    const emi=calculateEmi(remainingPrincipal,rate,tenure).toFixed(2);

    // saving loan details to database
    try{
        const loan = new Loan({
            principal: remainingPrincipal,
            rate,
            tenure,
            prepayment,
            emi
        });
        await loan.save();

        res.status(201).json({
            message: "emi calculated succesfully",
            loanId:loan._id,
            emi,
            tenure
        });
    }catch(err)
    {
        res.status(500).json({message:"error saving to database",err});
    }
    }
);


// retriving loan by id

app.get("/loan/:id",async (req,res)=>{
    try{
        const loan = await Loan.findById(req.params.id);
        if(!loan)
        {
            return res.status(404).json({message:"loan not found"});
        }
        res.json(loan);
    } catch(err)
    {
        res.status(500).json({message:"error retrieving loan",err});
    }
});



app.listen(PORT,()=>{
    console.log(`server is listening on port ${PORT}`);
})