require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
// const http2 = require('http2');

// const fs = require("fs");
const Promise =  require('bluebird');
const fs = Promise.promisifyAll(require('fs')); 
const spdy = require("spdy");

const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
const Category = require("./models/category");
var MongoStore = require("connect-mongo")(session);
const connectDB = require("./config/db");
const http2 = require("http2");
const { BloomFilter } = require("./public/javascripts/bloomfilter");

const app = express();

require("./config/passport");

// mongodb configuration
connectDB();
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// admin route
const adminRouter = require("./routes/admin");
app.use("/admin", adminRouter);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
    }),
    //session expires after 3 hours
    cookie: { maxAge: 60 * 1000 * 60 * 3 },
  })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// global variables across routes
app.use(async (req, res, next) => {
  try {
    res.locals.login = req.isAuthenticated();
    res.locals.session = req.session;
    res.locals.currentUser = req.user;
    const categories = await Category.find({}).sort({ title: 1 }).exec();
    res.locals.categories = categories;
    next();
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

// add breadcrumbs
get_breadcrumbs = function (url) {
  var rtn = [{ name: "Home", url: "/" }],
    acc = "", // accumulative url
    arr = url.substring(1).split("/");

  for (i = 0; i < arr.length; i++) {
    acc = i != arr.length - 1 ? acc + "/" + arr[i] : null;
    rtn[i + 1] = {
      name: arr[i].charAt(0).toUpperCase() + arr[i].slice(1),
      url: acc,
    };
  }
  return rtn;
};
app.use(function (req, res, next) {
  req.breadcrumbs = get_breadcrumbs(req.originalUrl);
  next();
});

//routes config
const indexRouter = require("./routes/index");
const productsRouter = require("./routes/products");
const usersRouter = require("./routes/user");
const pagesRouter = require("./routes/pages");
app.use("/products", productsRouter);
app.use("/user", usersRouter);
app.use("/pages", pagesRouter);
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

var port = process.env.PORT || 443;
// app.set("port", port);
// app.listen(port, () => {
//   console.log("Server running at port " + port);
// });

const server = spdy
  .createServer(
    {
      key: fs.readFileSync("../privkey.pem"),
      cert: fs.readFileSync("../cert.pem"),
    },
    app
  )
  .listen(port, (err) => {
    if (err) {
      throw new Error(err);
    }

    /* eslint-disable no-console */
    console.log("Listening on port: " + port + ".");
    /* eslint-enable no-console */
  });

const WebSocket = require("ws");
const wss = new WebSocket.Server({ server });


wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    message = JSON.parse(message)
    console.log(message);

    if (message.method == 'GET') {
      let dependencies = ["/javascripts/main.js", "/stylesheets/style.css"];
      let dependencyType = ["application/javascript", "text/css"];
      
      // Use BloomFilter to prevent pushing of cached resources
      if (message.buckets && message.k) {
        const filter = new BloomFilter(message.buckets, message.k);
  
        for (let i = 0; i < dependencies.length; i++) {
          if (filter.test(dependencies[i])) {
            console.log('Did not push:', dependencies[i])
            delete dependencies[i];
            delete dependencyType[i];
          }
        }
  
        dependencies = dependencies.filter((value) => value !== undefined);
        dependencyType = dependencyType.filter((value) => value !== undefined);
      }
      console.log(dependencies);
      
      for(let index = 0; index < dependencies.length; index++) {
        fs.readFileAsync(`${__dirname}/public${dependencies[index]}`)
        .then( (file) => {
          ws.send(JSON.stringify({ file, filename: dependencies[index], type: dependencyType[index] }));
          if (index==dependencies.length-1){
            let after_push = new Date();
            let after_push_time = after_push.getTime();
            console.log("PUSH time: " + after_push_time)
          }
        })
      }
      // dependencies.map((dep) => fs.readFileSync(`${__dirname}/public${dep}`))
      //   .forEach((dep, index) => {
      //     ws.send(JSON.stringify({ dep, filename: dependencies[index], type: dependencyType[index] }));
      //     console.log('Pushed:', dependencies[index], dependencyType[index]);
      //   });
      //   let after_push = new Date();
      //   let after_push_time = after_push.getTime();
      //   console.log("PUSH time: " + after_push_time)  
    }

  });
});

module.exports = { app, wss };
