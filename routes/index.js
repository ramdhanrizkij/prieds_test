var express = require('express');
var router = express.Router();
const stock_read_log = require('../models/stock_read_log');
const FileSystem = require("fs");

router.use('/export-data', async (req, res) => {
  const list = await stock_read_log.aggregate([
    {
      $match: {}
    }
  ]).exec();
  
  FileSystem.writeFile('./stock_read_log.json', JSON.stringify(list), (error) => {
      if (error) throw error;
  });

  console.log('stock_read_log.json exported!');
  res.json({statusCode: 1, message: 'stock_read_log.json exported!'})
});

router.use('/import-data', async (req, res) => {
  const list = await stock_read_log.aggregate([
    {
      $match: {}
    }
  ]).exec();
  
  FileSystem.readFile('./stock_read_log.json', async (error, data) => {
      if (error) throw error;

      const list = JSON.parse(data);

      const deletedAll = await stock_read_log.deleteMany({});

      const insertedAll = await stock_read_log.insertMany(list);

      console.log('stock_read_log.json imported!');
  res.json({statusCode: 1, message: 'stock_read_log.json imported!'})
  });
})

router.use('/get-data', async(req,res)=>{
  const {payload} = req.query
  const list = await stock_read_log.findOne({
    payload: payload
  }).exec()
  return res.json({status:200, data: list})
})

router.use('/edit-repacking-data', async (req, res) => {
  try {
    const {company_id, payload, reject_qr_list,new_qr_list} = req.body
    let models = await stock_read_log.findOne({
      payload: payload,
      company_id: company_id
    }).exec()
    if(!models) return res.status(404).json({status:404, message:"Data not found"})
    
    let qr_list = models.qr_list
    for(let i in reject_qr_list) {
      const rejected = reject_qr_list[i]
      const newItem = new_qr_list[i]
      const _rejected = qr_list.findIndex((x)=>x[Object.keys(rejected)[0]]==rejected[Object.keys(rejected)[0]])
      if (_rejected < 0) continue;

      console.log("test : ", i<=newItem.length-1)
      if(i < new_qr_list.length ){
        const oldQr = await stock_read_log.findOne({
          "qr_list.payload":newItem.payload
        }).exec()
        if(oldQr){
          const qrListOld = oldQr.qr_list.filter((x)=>x.payload!=newItem.payload)
          await stock_read_log.updateOne({"qr_list.payload":newItem.payload},{
            qty: qrListOld.length,
            qr_list:qrListOld
          })
          qr_list.push(...oldQr.qr_list.filter((x)=>x.payload===newItem.payload))
        }
      }
      qr_list.splice(_rejected,1)
    }
    await stock_read_log.updateOne({payload:payload},{
      qr_list: qr_list,
      qty: qr_list.length
    })

    return res.json({
      status:200,
      message:"Success",
      qr_list: qr_list
    })

  }catch(e){
    console.log("Error : ", e)
    return res.status(400).json({
      status:400,
      message:e.message,
    })
  }
})

router.use('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
