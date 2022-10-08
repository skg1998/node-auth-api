const express =require('express');
const users = express.Router();
const nodemailer = require('nodemailer');
const async = require('async');
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const User= require("../models/User");
process.env.SECRET_KEY = 'secret';



//signup
users.get('/register',(req,res)=>{
    res.render('register');
})

//login 
users.get('/login',(req,res)=>{
    res.render('login');
});

//dashbord
users.get('/dashboard',(req,res)=>{
  res.render('dashboard',{
      name:req.user.name
  })
});

//forget
users.get('/forgot',(req, res)=> {
    res.render('forgot');
});


//reset :token
users.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
            res.render('reset', {
            user: req.user
        });
    });
});


//signup  Handler
users.post('/register',(req,res)=>{
    const today = new Date()
    var {name,email,password,password2} = req.body;
    console.log(req.body);
    var NewUser = new User({
        name:req.body.name,
        email:req.body.email,
        password:req.body.password,
        created:today
    });

    //validation 
    let errors = [];

    //check require feild
    if(!name || !email || !password || !password2){
        errors.push({ msg :'Please fill in all fields'});
    }

    //check password match
    if( password != password2){
        errors.push({ msg :'password must be equal'});
    }

    //password length
    if(password.length < 6){
        errors.push({msg :'Password length must be greater than 6'});
    }

    if(errors.length >0){
        res.render('register',{
            errors,
            name,
            email,
            password,
            password2
        });
    }else{
        User.findOne({
            email:req.body.email
        })
        .then(user =>{
            if(!user){
                NewUser.setPassword(req.body.password); 
                NewUser.save().then(user =>{
                    res.redirect('/users/login');
                    res.json({status:user.email+' registered'});
                })
                .catch(err =>{
                    res.send('error: '+ err)
                })
            }else{
                errors.push({msg:'User already exists'});
                res.render('register',{
                    errors,
                    name,
                    email,
                    password,
                    password2
                });
            }
        })
        .catch(err =>{
            res.send('error: '+err)
        })
    }
});


//login Handler
users.post('/login',(req,res,next)=>{
    console.log(req)
    User.findOne({ email : req.body.email }, function(err, user) { 
        if (user === null) { 
            return res.status(400).send({ 
                message : "User not found."
            }); 
        } 
        else { 
            if (user.validPassword(req.body.password)){
                const payload = {
                    _id:user._id,
                    email:user.email
                }
                let token = jwt.sign(payload, process.env.SECRET_KEY,{
                    expiresIn:1440
                })
                // res.send(`dashboard ${payload.email}!`)
                res.json({
                    token: token,
                    payload: payload
                });
            } 
            else { 
                return res.status(400).send({ 
                    message : "Wrong Password"
                }); 
            } 
        } 
    }); 
})

//admin-dashboard
users.get('/dashboard',(req,res)=>{
    var decoded = jwt.verify(req.headers['authorization'], process.env.SECRET_KEY)
    User.findOne({
        _id:decoded._id
    }, {
        hash: 0,
        salt: 0
    })
    .then(user=>{
        if(user){
            res.json(user)
        }else{
            res.send("User doesnot exist")
        }
    })
    .catch(err => {
        res.send('error: '+err)
    })
});


//logout
users.get('/logout',(req,res)=>{
    req.logout();
    res.redirect('users/login');
});


//forget password
users.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/users/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport('SMTP', {
          service: 'SendGrid',
          auth: {
            user: '!!! YOUR SENDGRID USERNAME !!!',
            pass: '!!! YOUR SENDGRID PASSWORD !!!'
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'passwordreset@demo.com',
          subject: 'Node.js Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/users/forgot');
    });
  });



//reset :token api
users.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
  
          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
  
          user.save(function(err) {
            req.logIn(user, function(err) {
              done(err, user);
            });
          });
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport('SMTP', {
          service: 'SendGrid',
          auth: {
            user: '!!! YOUR SENDGRID USERNAME !!!',
            pass: '!!! YOUR SENDGRID PASSWORD !!!'
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'passwordreset@demo.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/');
    });
  });

module.exports= users;