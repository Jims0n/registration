require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
  
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));



app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://Botterfly:Ope123@cluster0.8pupq.mongodb.net/registrationDB", {useNewUrlParser: true});
 

const registrationSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});


registrationSchema.plugin(passportLocalMongoose);
registrationSchema.plugin(findOrCreate);

const Registration = new mongoose.model("Registration", registrationSchema);

passport.use(Registration.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/registration",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    Registration.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/registration", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    if (req.isAuthenticated()){
        res.render("secrets");
    }else {
        res.redirect("/login");
    }
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
}else {
    res.redirect("/login");
}
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  console.log(req.registration.id);

  Registration.findById(req.registration.id, function(err, foundRegistration){
    if (err){
      console.log(err);
    }else{
      if (foundRegistration){
        foundRegistration.secret = submittedSecret;
        foundRegistration.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout", function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });


app.post("/register", function(req, res){

    Registration.register({username: req.body.username, active: false}, req.body.password, function(err, registration) {
        if (err) { 
            console.log(err);
            res.redirect("/register")
         }else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            })
         }
      
      
       
      });
    
});


app.post("/login", function(req, res){
    
const registration = new Registration({
    username: req.body.username,
    password: req.body.password
});

req.login(registration, function(err){
    if (err) {
        console.log(err);
    }else{
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
        })
    }
})

});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){
console.log("Server started sucessfullym");
}) 
