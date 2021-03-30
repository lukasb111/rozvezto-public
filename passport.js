const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");

const keys = require("../config/keys");
const Seller = mongoose.model("sellers");
const User = mongoose.model("users");

function SessionConstructor(userId, userGroup, details) {
  this.userId = userId;
  this.userGroup = userGroup;
  this.details = details;
}

passport.serializeUser(function (userObject, done) {
  // userObject could be a Model1 or a Model2... or Model3, Model4, etc.
  let userGroup = "users";
  let userPrototype = Object.getPrototypeOf(userObject);

  if (userPrototype === User.prototype) {
    userGroup = "users";
  } else if (userPrototype === Seller.prototype) {
    userGroup = "sellers";
  }

  let sessionConstructor = new SessionConstructor(userObject.id, userGroup, "");
  done(null, sessionConstructor);
});

passport.deserializeUser(function (sessionConstructor, done) {
  if (sessionConstructor.userGroup === "users") {
    User.findOne(
      {
        _id: sessionConstructor.userId,
      },
      "-localStrategy.password",
      function (err, user) {
        // When using string syntax, prefixing a path with - will flag that path as excluded.
        done(err, user);
      }
    );
  } else if (sessionConstructor.userGroup === "sellers") {
    Seller.findOne(
      {
        _id: sessionConstructor.userId,
      },
      "-localStrategy.password",
      function (err, user) {
        // When using string syntax, prefixing a path with - will flag that path as excluded.
        done(err, user);
      }
    );
  }
});

passport.use(
  new FacebookStrategy(
    {
      clientID: keys.facebookClientID,
      clientSecret: keys.facebookClientSecret,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["displayName", "photos"],
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      const existingUser = await User.findOne({ "facebook.id": profile.id });

      console.log(profile);

      if (existingUser) {
        return done(null, existingUser);
      }

      const user = await new User({
        "facebook.id": profile.id,
        "facebook.name": profile.displayName,
        "facebook.profilePicture": profile.photos[0].value,
        "facebook.credits": 0,
      }).save();
      done(null, user);
    }
  )
);

// =========================================================================
// LOCAL SIGNUP ============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use(
  "local-signup",
  new LocalStrategy(
    {
      // by default, local strategy uses username and password, we will override with email
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true, // allows us to pass back the entire request to the callback
      proxy: true,
    },
    function (req, email, password, done) {
      // asynchronous
      // User.findOne wont fire unless data is sent back
      process.nextTick(function () {
        console.log("local signup ran");
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ "local.email": email }, function (err, user) {
          // if there are any errors, return the error
          if (err) return done(err);

          // check to see if theres already a user with that email
          if (user) {
            return done(null, false);
          } else {
            // if there is no user with that email
            // create the user
            const newUser = new User();

            // set the user's local credentials
            newUser.local.email = email;
            newUser.local.password = newUser.generateHash(password);
            newUser.local.credits = 0;

            // save the user
            newUser.save(function (err) {
              if (err) throw err;
              return done(null, newUser);
            });
          }
        });
      });
    }
  )
);

// =========================================================================
// LOCAL LOGIN =============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use(
  "local-login",
  new LocalStrategy(
    {
      // by default, local strategy uses username and password, we will override with email
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true, // allows us to pass back the entire request to the callback
      proxy: true,
    },
    function (req, email, password, done) {
      // callback with email and password from our form
      console.log("local login in passwport ran");

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      User.findOne({ "local.email": email }, function (err, user) {
        // if there are any errors, return the error before anything else

        if (err) return done(err);

        // if no user is found, return the message
        if (!user) {
          return done(null, false, { message: "No user found" }); // req.flash is the way to set flashdata using connect-flash
        }
        // if the user is found but the password is wrong
        if (!user.validPassword(password))
          return done(null, false, { message: "Wrong password" }); // create the loginMessage and save it to session as flashdata

        // all is well, return successful user
        return done(null, user);
      });
    }
  )
);

passport.use(
  "local-signup-seller",
  new LocalStrategy(
    {
      passReqToCallback: true, // allows us to pass back the entire request to the callback
      proxy: true,
    },
    function (req, username, password, done) {
      process.nextTick(function () {
        console.log("Seller signup ran");
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        Seller.findOne({ name: username }, function (err, user) {
          // if there are any errors, return the error
          if (err) return done(err);

          // check to see if theres already a user with that email
          if (user) {
            return done(null, false);
          } else {
            // if there is no user with that email
            // create the user
            const newSeller = new Seller();

            // set the user's local credentials
            newSeller.name = username;
            newSeller.password = newSeller.generateHash(password);

            // save the user
            newSeller.save(function (err) {
              if (err) throw err;
              return done(null, newSeller);
            });
          }
        });
      });
    }
  )
);

passport.use(
  "local-login-seller",
  new LocalStrategy(
    {
      passReqToCallback: true, // allows us to pass back the entire request to the callback
      proxy: true,
    },
    function (req, username, password, done) {
      // callback with email and password from our form
      console.log("merchant login in passport ran");
      console.log(req.body);

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      Seller.findOne({ name: username }, function (err, user) {
        // if there are any errors, return the error before anything else

        if (err) return done(err);

        // if no user is found, return the message
        if (!user) return done(null, false, { message: "No user found" }); // req.flash is the way to set flashdata using connect-flash

        // if the user is found but the password is wrong
        if (!user.validPassword(password))
          return done(null, false, { message: "Wrong password" }); // create the loginMessage and save it to session as flashdata

        // all is well, return successful user
        return done(null, user);
      });
    }
  )
);
