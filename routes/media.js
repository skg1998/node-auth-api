const express = require('express');
const path = require('path');
const Media = require('../models/media');
const fileUpload = express.Router();
const multer = require('multer');
const storage = multer.diskStorage({
   destination:function(req,res,cb){
       cb(null,'./upload/')
    },
    filename:function(req,file,cb){
       cb(null ,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
    fileFilter:function(req,file,cb){
       if(file.mimetype=='video/mp4'){
          cb(null,true);
       }else{
          cb(null,false);
       }
    }
});

const upload = multer({
   storage:storage,
});


//file-upload
fileUpload.get('/api/media/upload',(req,res)=>{
   res.render('media-upload')
});

//file-upload api
fileUpload.post('/api/media/upload',upload.single('file'),(req,res,next)=>{
   console.log(req.file);
   const today = new Date();
   var newMedia = new Media({
        path:req.file.path,
        created:today
   });
   newMedia.save().then(result=>{
      console.log(result);
      res.status(201).json({
         message:"file uploaded successfully",
      })
   })
})


//file getting api
fileUpload.get('/files',(req,res)=>{
   // Media.files.find({}).toArray((error,files)=>{
   //     //check file
   //     if(!files || files.length ==0){
   //        return res.status(404).json({
   //           err: 'No files exit'
   //        })
   //     }

   //     //files exist
   //     return res.json(files);
   // })
})

module.exports = fileUpload;