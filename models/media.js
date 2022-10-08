const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mediaSchema = new Schema({
    path:  { type: String },
    date:{
        type:Date,
        default:Date.now
     }
})

module.exports = mongoose.model('media', mediaSchema);