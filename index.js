// requires basic packages and files
const express = require("express");
const methodOverride = require("method-override");
const bodyParser=require("body-parser");
const path = require("path");
const ejsMate = require("ejs-mate");
const mongoose = require("mongoose");
const Item = require("./Models/list.js");
const Customer = require("./Models/customer.js");
const CurrentUser = require("./Models/currentUser.js");
const Cart = require("./Models/cart.js");
const Order = require("./Models/order.js");
const Search = require("./Models/search.js");
const customError = require("./customError.js");
const session = require("express-session");
const flash = require("connect-flash");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // to access data of  .env
const cookie = require("cookie");
const axios = require("axios");
const bcrypt = require("bcrypt");
const browserSync=require("browser-sync");
const nocache=require('nocache');

const app = express();
//basic setup

// database connectivity
main()
  .then((res) => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/ElectronicGadgets");
}

// for creating sessions
let sessionOption = {
  secret: "mysupersecretcode",
  resave: false,
  saveuninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: Date.now() + 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};
app.use(session(sessionOption));
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// for get data from post request that is send as a post request
app.use(express.urlencoded({ extended: true }));

// form can only send  get and post request, to convert other type request
app.use(methodOverride("_method"));

// ejs file set path
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// serving static files(css,js)
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));


// used to parse incoming JOSN request bodies and makes the data available in req.body
app.use(express.json());

// Middlware (after logout user can't go back and enter in login)



//app.use(nocache());

// for use ejs-mate
app.engine("ejs", ejsMate);

const port =8080;  
app.listen(port, () => {
  console.log(`Server started at port ${port}`);
});


// routes (Homepage)
app.get("/", (req, res) => {
  res.send("Hii, I am root directory");
});

// homepage also logout (user and admin)
app.get("/homepage", async (req, res, next) => {

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

  // logout admin
  res.cookie("adminToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  // logout user
  res.cookie("userToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

 
  try {
    let allItem = await Item.find({});
    
    res.render("homepage.ejs", { allItem });
  } catch (err) {
    next(new customError(500, "Failed to load Homepage"));
  }
});

//login
app.get("/homepage/login", (req, res) => {
  res.render("loginform.ejs");
});

// signUp
app.get("/homepage/signup", (req, res) => {
  res.render("signupform.ejs");
});  

// show route(display specification of particular product)
app.get("/homepage/:id/showInfo", async (req, res, next) => {
  try {
    let { id } = req.params;
    let item = await Item.findById(id);
    if (!item) throw new customError(500, "Item Not Found");
    res.render("show.ejs", { item });
  } catch (err) {
    next(err);
  }
});

// admin panel
app.get("/admin", (req, res) => {
  res.render("adminform.ejs");
});

// verification and login(get access to admin)
app.post("/admin/homepage", async (req, res, next) => {
  try {
    let name = "admin";
    let pass = "Admin@123";
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]+$/;  

    let { username, password } = req.body;
    // console.log(passwordRegex.test(password));

    if (password.length < 8) {
      req.flash("error", "password must be atleast 8 character");
      res.redirect("/admin");
    } else if (!passwordRegex.test(password)) {
      req.flash(
        "error",
        "password must be contain one Capital and Small letter one Special Character and Number"
      );
      res.redirect("/admin");
    } else {
      const trimedUsername = username.trim();
      const trimedPassword = password.trim();

      const tokenData = {
        id: 80,
        admin: trimedUsername,
        password: trimedPassword,
      };
      const token = jwt.sign(tokenData, process.env.TOKEN_SECRET, {
        expiresIn: "1d",
      });

      if (trimedUsername === name && trimedPassword === pass) {
        console.log("All correct");
        res.cookie("adminToken", token, { httpOnly: true });
        let allItem = await Item.find({});

        res.render("alter.ejs", { allItem });
      } else {
        res.render("adminError.ejs");
      }
    }
  } catch (err) {
    next(err);
  }
});

app.get("/admin/homepage", async (req, res, next) => {
  // get cookies from browser cookie
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  console.log(cookies);
  if (cookies.adminToken) {
    try {
      let allItem = await Item.find({});
      res.render("alter.ejs", { allItem });
    } catch (err) {
      next(err);
    }
  } else res.redirect("/admin");
});

// delete particualar item(delete route)
app.delete("/admin/:id/delete", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.adminToken){
    try {
      let { id } = req.params;
      let deletedItem = await Item.findByIdAndDelete(id);
      req.flash("success", "Deleted item successfully");
      let allItem = await Item.find({});
      res.redirect("/admin/homepage");
    } catch (err) {
      next(err);
    }
  }
  else 
     res.redirect("/admin");
  
});

//edit item(update route)
app.get("/admin/:id/edit", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.adminToken){
    try {
      let { id } = req.params;
      let item = await Item.findById(id);
      if (!item) throw new customError(500, "Item Not Found");
      res.render("edit.ejs", { item });
    } catch (err) {
      next(err);
    }
  }
  else 
     res.redirect("/admin");
 
});
app.put("/admin/:id", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
   if(cookies.adminToken){
    try {
      let { id } = req.params;
      let item = req.body.item;
      await Item.findByIdAndUpdate(id, item);
      req.flash("success", "Edit Successfully");
      let allItem = await Item.find({});
      res.redirect("/admin/homepage");
    } catch (err) {
      next(new customError(500, "Please follow all mongoose schema constraints"));
    }
   }
   else 
     res.redirect("/admin");
  
});

// add item
app.get("/admin/new", (req, res) => {
  res.render("new.ejs");
});
app.post("/admin/new", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.adminToken){
    try {
      let newItem = req.body.item;
      let i = new Item(newItem);
      await i.save();
      req.flash("success", "Item added successfully");
      let allItem = await Item.find({});
      res.redirect("/admin/homepage");
    } catch (err) {
      next(new customError(500, "Please follow all mongoose schema constraints"));
    }
  }
  else 
     res.redirect("/admin");
  
});

// signUp (User panel)
// signUp stores(customers data)
app.post("/homepage/signUp", async (req, res, next) => {
  try {
    await CurrentUser.deleteMany({}); // for track current login or signup user
    let { username, email, password, confirmPassword, mobNo, address } =
      req.body;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]+$/;

    if (password.length < 8 && password != confirmPassword) {
      req.flash(
        "error",
        "password and confirm password should be same and password At least 8 character"
      );
      res.redirect("/homepage/signup");
    } else if (password.length < 8) {
      req.flash("error", "password  must be  Atleast 8 character");
      res.redirect("/homepage/signup");
    } else if (password != confirmPassword) {
      req.flash("error", "password and confirm password should be same");
      res.redirect("/homepage/signup");
    } else if (!passwordRegex.test(password)) {
      req.flash(
        "error",
        "password must be contain one Capital and Small letter one Special Character and Number"
      );
      res.redirect("/homepage/signup");
    } else {
      const saltRound = 10;
      const bcryptPass = await bcrypt.hash(password, saltRound);

      const trimedUsername=username.trim();

      let data = {
        username: trimedUsername,
        email: email,
        password: bcryptPass,
        mobNo: mobNo,
        address: address,
      };

      let user = new CurrentUser({
        username: data.username,
      });

      let customer = new Customer(data);
      // save token in browser cookie
      const tokenData = {
        id: 80,
        username: username,
        password: password,
      };
      const token = jwt.sign(tokenData, process.env.TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.cookie("userToken", token, { httpOnly: true });

      await customer.save();
      await user.save();

      // // find Who login
      //  let currentUser=await CurrentUser.find({});
      //  let customers=await Customer.find({});
      //  let cust;
      //  for(customer of customers){
      //      if(customer.username==currentUser[0].username){
      //           cust=customer;
      //      }
      //   }
      let allItem = await Item.find({});
      // res.render("loginHomepage.ejs",{allItem,cart:cust.carts.length});
      res.redirect("/loginHomepage");
    }
  } catch (err) {
    req.flash("error", "Username or email already exist");
    res.redirect("/homepage/signup");
  }
});

// login user
app.post("/homepage/login", async (req, res, next) => {
  try {
    await CurrentUser.deleteMany({});
    let login = req.body.login;
    login.username=login.username.trim();
    
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]+$/;

    if (login.password.length < 8) {
      req.flash("error", "password must be atleast 8 character");
      res.redirect("/homepage/login");
    } else if (!passwordRegex.test(login.password)) {
      req.flash(
        "error",
        "password must be contain one Capital and Small letter one Special Character and Number"
      );
      res.redirect("/homepage/login");
    } else {
      let user = new CurrentUser({
        username: login.username,
      });
      await user.save();
      let customers = await Customer.find({});
      

      for (customer of customers) {
        const passCompareResult=await bcrypt.compare(login.password,customer.password);
        

        if ( 
          login.username === customer.username &&
          passCompareResult
        ) {
          // save token in browser cookie
          const tokenData = {
            id: 80,
            username: customer.username,
            password: customer.password,
          };
          const token = jwt.sign(tokenData, process.env.TOKEN_SECRET, {
            expiresIn: "1d",
          });
          res.cookie("userToken", token, { httpOnly: true });

          res.redirect("/loginHomepage");
        }
         
        
      }
      res.render("error.ejs");
    }
  } catch (err) {
    next(err);
  }
});

// login show product
app.get("/homepage/:id/loginShowInfo", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.userToken){
    try {
      let { id } = req.params;
      let item = await Item.findById(id);
      if (!item) throw new customError(500, "Item Not Found");
      res.render("loginShow.ejs", { item });
    } catch (err) {
      next(err);
    }
  }
  else 
     res.redirect("/homepage");
  
});

// add to cart
app.post("/homepage/signUp/:id/cart", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  if(cookies.userToken){
    try {
      let { id } = req.params;
    
      let currentUser = await CurrentUser.find({});
  
      // find Who login
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == currentUser[0].username) {
          cust = customer;
        }
      }
  
      let item = await Item.findById(id);
      let newItem = new Cart({
        type: item.type,
        title: item.title,
        description: item.description,
        specification: item.specification,
        image: item.image,
        price: item.price,
      });
  
      cust.carts.push(newItem);
      await newItem.save();
      let result = await cust.save();
      console.log(result);   
      // res.redirect("/loginHomepage");
      res.send(`success`);
    } catch (err) {
      next(err);
    }
  }
  else 
     res.redirect("/homepage");
  
});



// show cart
app.get("/homepage/signUp/cart", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  if(cookies.userToken){
    try {
      // find Who login
      let currentUser = await CurrentUser.find({});
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == currentUser[0].username) {
          cust = customer;
        }
      }
      let items = await Customer.find({ username: cust.username }).populate(
        "carts"
      );
      let Items = items[0];
      // calculate price
      let price = 0;
      for (item of Items.carts) {
        price = price + item.price;
      }
      if (cust.carts.length) res.render("cart.ejs", { Items, totalPrice: price });
      else res.render("emptyCart.ejs");
    } catch (err) {
      next(err);
    }
  }
  else 
    res.redirect("/homepage");
  
});

// delete from cart
app.delete("/homepage/:id/carts/:cartId", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.userToken){
    try {
      let { id, cartId } = req.params;
      let res1 = await Customer.findByIdAndUpdate(id, {
        $pull: { carts: cartId },
      });
      let res2 = await Cart.findByIdAndDelete(cartId);
      res.redirect("/homepage/signUp/cart");
    } catch (err) {
      next(err);
    }
  }
  else 
     res.redirect("/homepage");
  
});

// buy route (by without going to  cart)
app.get("/homepage/signUp/:itemId/buy", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.userToken){
    try {
      let { itemId } = req.params;
  
      // find Who login
      let currentUser = await CurrentUser.find({});
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == currentUser[0].username) {
          cust = customer;
        }
      }
      let date = Math.floor(Math.random() * 30) + 1;
      let month = new Date().getMonth();
      let year = new Date().getFullYear();
      let status = "Expected at: " + date + "/" + month + "/" + year;
      let item = await Item.findById(itemId);
      let newOrder = new Order({
        orderName: item.title,
        orderImage: item.image,
        orderPrice: item.price,
        orderStatus: status,
        orderAddress: cust.address,
        customerName: cust.username,
        mobNo: cust.mobNo,
        status: "Pending",
      });
      await cust.orders.push(newOrder);
      await newOrder.save();
      await cust.save();
      res.render("orderSuccess.ejs", { item });
    } catch (err) {
      next(err);
    }
  }
  else 
    res.redirect("/homepage");
  
});
// buy route (through cart)
app.get("/homepage/signUp/:cartId/buyNow", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.userToken){
    try {
      let { cartId } = req.params;
      // find Who login
      let currentUser = await CurrentUser.find({});
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == currentUser[0].username) {
          cust = customer;
        }
      }
      let date = Math.floor(Math.random() * 30) + 1;
      let month = new Date().getMonth();
      let year = new Date().getFullYear();
      let status = "Expected at: " + date + "/" + month + "/" + year;
  
      let item = await Cart.findById(cartId);
  
      let newOrder = new Order({
        orderName: item.title,
        orderImage: item.image,
        orderPrice: item.price,
        orderStatus: status,
        orderAddress: cust.address,
        customerName: cust.username,
        mobNo: cust.mobNo,
        status: "Pending",
      });
      await cust.orders.push(newOrder);
      await newOrder.save();
      await cust.save();
      res.render("orderSuccess.ejs", { item });
    } catch (err) {
      next(err);
    }
  }
  else 
     res.redirect("/homepage");
  
});

// All orders
app.get("/homepage/signUp/orders", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.userToken){
    try {
      // find Who login
      let currentUser = await CurrentUser.find({});
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == currentUser[0].username) {
          cust = customer;
        }
      }
      let order = await Customer.find({ username: cust.username }).populate(
        "orders"
      );
      let Orders = order[0];
      if (cust.orders.length) res.render("orders.ejs", { Orders });
      else res.render("emptyOrder.ejs");
    } catch (err) {
      next(err);
    }
  }
  else 
    res.redirect("/homepage");
  
});

// cancel orders
app.get("/homepage/signUp/:id/cancelOrder/:orderId", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if(cookies.userToken){
    try {
      let { id, orderId } = req.params;
      await Customer.findByIdAndUpdate(id, { $pull: { orders: orderId } });
      await Order.findByIdAndDelete(orderId);
      res.render("orderCancel.ejs");
    } catch (err) {
      next(err);
    }
  }
  else 
     res.redirect("/homepage");
  
});

// return to login(User) from Logout
app.get("/loginHomepage", async (req, res, next) => {

  
    
    res.setHeader('Cache-Control', 'no-store');                                     
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  // console.log("loginCookies= ", cookies.userToken);
  if (cookies.userToken) {
    try {
      // find Who login
      let currentUser = await CurrentUser.find({});
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == currentUser[0].username) {
          cust = customer;
        }
      }

      let allItem = await Item.find({});
      res.render("loginHomepage.ejs", { allItem, cart: cust.carts.length });  
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage");
});

// searching items (homepage)
app.post("/homepage/searchResult", async (req, res, next) => {
  try {
    let { selectedCategory, customCategory } = req.body;
    let searchItem;
    


    let allItem = await Item.find({});
    if(selectedCategory==='Other'){
        searchItem=allItem.filter(item=>item.title==customCategory)
    }
    else{
       searchItem=allItem.filter(item=>item.type==selectedCategory);
    }
   

    if (searchItem.length==0) res.render("noSearchFound.ejs");
    else {
      res.render("searches.ejs", { searchItem });
    }
  } catch (err) {
    next(err);
  }
});

// top deals route (homepage)
app.post("/homepage/topDeals/Explore",async(req,res,next)=>{
    try {
      let {type}=req.body;
      const allItems= await Item.find({});
      const allItem=allItems.filter(item=>item.type===type);
      res.render("topDealHomepage.ejs",{allItem});
    } catch (error) {
      next(error);
    }
});  

app.post("/loginHomepage/topDeals/Explore",async(req,res,next)=>{

    // res.setHeader('Cache-Control', 'no-store');
    // res.setHeader('Pragma', 'no-cache');
    // res.setHeader('Expires', '0');
    
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  if (cookies.userToken){
    try {
      let {type}=req.body;
       // find Who login
       let currentUser = await CurrentUser.find({});
       let customers = await Customer.find({});
       let cust;
       for (customer of customers) {
         if (customer.username == currentUser[0].username) {
           cust = customer;
         }
       }

      const allItems= await Item.find({});
      const allItem=allItems.filter(item=>item.type===type);
      res.render("topDealLoginHomepage.ejs",{allItem, cart:cust.carts.length});

    } catch (error) {
       next(error);
    }
  }
  else 
     res.redirect("/homepage");
    
});

// searching items (login Homepage)
app.post("/homepage/signUp/searchResult", async (req, res, next) => {

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  if(cookies.userToken){
    try {
      // find Who login
      let currentUser = await CurrentUser.find({});
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == currentUser[0].username) {
          cust = customer;
        }
      }
      let { selectedCategory, customCategory } = req.body;
      let searchItem;
  
      let allItem = await Item.find({});
      if(selectedCategory==='Other'){
        searchItem=allItem.filter(item=>item.title==customCategory)
    }
    else{
       searchItem=allItem.filter(item=>item.type==selectedCategory);
    }
    
   
      if (searchItem.length==0) res.render("noSearchFoundLogin.ejs");
      else {
        res.render("loginSearches.ejs", { searchItem, cart: cust.carts.length });
      }
    } catch (err) {
      next(err);
    }
  }
  else 
     res.redirect("/homepage/login");
  
});

// error handling middleWare
app.use((err, req, res, next) => {
  console.log("--------ERROR----------");
  console.log(err.name);
  console.log(err.message);
  let { status = 500, message = "Some Error Occured" } = err;
  // res.status(status).send(message);
  res.status(status).render("errors.ejs", { message });
});

// when any route not match (page not found)
app.use((req, res) => {
  res.render("pageNotFound.ejs");
});
