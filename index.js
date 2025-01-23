// requires basic packages and files
const express = require("express");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const path = require("path");
const ejsMate = require("ejs-mate");
const mongoose = require("mongoose");
const Item = require("./Models/list.js");
const Customer = require("./Models/customer.js");
const Cart = require("./Models/cart.js");
const Order = require("./Models/order.js");
const Review=require("./Models/review.js");
const customError = require("./customError.js");
const session = require("express-session");
const flash = require("connect-flash");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // to access data of  .env
const cookie = require("cookie");
const bcrypt = require("bcrypt");
var store = require("store");
const { rmSync } = require("fs");
const cookieParser = require("cookie-parser");

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

 

// ue cookie-parse middleware
app.use(cookieParser());

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

const port = 8080;
app.listen(port, () => {
  console.log(`Server started at port ${port}`);
});

// routes (Homepage)
app.get("/", (req, res) => {
  const cookies=req.cookies;
  console.log("cookies= ",cookies);
  res.render("root.ejs");
});

// homepage also logout (user and admin)
app.get("/homepage", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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

  // clear username cookie
  res.cookie("username", "", {
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
    console.log(passwordRegex.test(password));

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

        res.render("adminHomepage.ejs");
      } else {
        req.flash("error","username or password is incorrect");
        res.redirect("/admin");
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
      res.render("adminHomepage.ejs");
    } catch (err) {
      next(err);
    }
  } else res.redirect("/admin");
});

app.post("/adminHomepage/topDeals/Extract", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.adminToken) {
    try {
      const { type } = req.body;
      const items = await Item.find({});
      const allItem = items.filter((item) => item.type === type);

      res.render("alter.ejs", { allItem });
    } catch (error) {}
  } else res.redirect("/admin");
});

// delete particualar item(delete route)
app.delete("/admin/:id/delete", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.adminToken) {
    try {
      let { id } = req.params;
      let deletedItem = await Item.findByIdAndDelete(id);
      req.flash("success", "Deleted item successfully");
      let allItem = await Item.find({});
      res.redirect("/admin/homepage");
    } catch (err) {
      next(err);
    }
  } else res.redirect("/admin");
});

//edit item(update route)
app.get("/admin/:id/edit", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.adminToken) {
    try {
      let { id } = req.params;
      let item = await Item.findById(id);
      if (!item) throw new customError(500, "Item Not Found");
      res.render("edit.ejs", { item });
    } catch (err) {
      next(err);
    }
  } else res.redirect("/admin");
});
app.put("/admin/:id", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.adminToken) {
    try {
      let { id } = req.params;
      let item = req.body.item;
      await Item.findByIdAndUpdate(id, item);
      req.flash("success", "Edit Successfully");
      let allItem = await Item.find({});
      res.redirect("/admin/homepage");
    } catch (err) {
      next(
        new customError(500, "Please follow all mongoose schema constraints")
      );
    }
  } else res.redirect("/admin");
});

// add item
app.get("/admin/new", (req, res) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.adminToken) res.render("new.ejs");
  else res.redirect("/admin");
});
app.post("/admin/new", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.adminToken) {
    try {
      let newItem = req.body.item;
      let i = new Item(newItem);
      await i.save();
      req.flash("success", "Item added successfully");
      let allItem = await Item.find({});
      res.redirect("/admin/homepage");
    } catch (err) {
      next(
        new customError(500, "Please follow all mongoose schema constraints")
      );
    }
  } else res.redirect("/admin");
});

app.get("/homepage/cart", (req, res) => {
  res.render("homepageCart.ejs");
});

// signUp (User panel)
// signUp stores(customers data)
app.post("/homepage/signUp", async (req, res, next) => {
  try {
    let { username, email, password, confirmPassword, mobNo } = req.body;
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

      const trimedUsername = username.trim();

      let data = {
        username: trimedUsername,
        email: email,
        password: bcryptPass,
        mobNo: mobNo,
      };

      // store username in cookie
      res.cookie("username", data.username, { httpOnly: true });

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

      res.redirect("/loginHomepage");
    }
  } catch (err) {
    console.log(err);
    req.flash("error", "Username or email already exist");
    res.redirect("/homepage/signup");
  }
});

// login user
app.post("/homepage/login", async (req, res, next) => {
  try {
    let login = req.body.login;
    login.username = login.username.trim();

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
      res.cookie("username", login.username, { httpOnly: true });

      let customers = await Customer.find({});

      for (customer of customers) {
        const passCompareResult = await bcrypt.compare(
          login.password,
          customer.password
        );

        if (login.username === customer.username && passCompareResult) {
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
      // res.render("error.ejs");
      req.flash("error", "Username or password is incorrect");
      res.redirect("/homepage/login");
    }
  } catch (err) {
    next(err);
  }
});

// add address
app.get("/loginHomepage/addresses", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    try {
      const customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }
      res.render("shippingAddress.ejs", { cust });
    } catch (error) {
      next(error);
    }
  } else res.redirect("/homepage/login");
});

// update address
app.post("/loginHomepage/updateAddress", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    try {
      const { fullName, contact, pincode, state, city, houseNo, roadName } =
        req.body;

      const newAddress =
        fullName +
        ", " +
        houseNo +
        " " +
        roadName +
        ", " +
        city +
        " " +
        state +
        "-" +
        pincode +
        ", phoneNo-" +
        contact;

      // find Who login
      const customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }
      console.log("cust= ", cust);
      cust.address = newAddress;
      await cust.save();

      req.flash("success", "address updated successfully");

      res.redirect("/loginHomepage/addresses");
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

// login show product
app.get("/homepage/:id/loginShowInfo", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    try {
      let { id } = req.params;
      // find Who login
      const cookies = req.headers.cookie
        ? cookie.parse(req.headers.cookie)
        : {};

      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }

      let item = await Item.findById(id);
      let reviews=await Item.findById(id).populate("reviews");
      console.log("reviews= ", reviews);
      console.log("itemA in items= ", item);
      
      if (item === null) {
        item = await Cart.findById(id);
        reviews=await Cart.findById(id).populate("reviews");
        console.log("reviews in cart=", reviews);
        console.log("itemA in cart= ", item);
      }
      if(item===null){
        item=await Order.findById(id);
        reviews=await Order.findById(id).populate("reviews");
        console.log("reviews in order=", reviews);
        console.log("itemA in order=", item);
      }

      
      
      if (!item) throw new customError(500, "Item Not Found");
      res.render("loginShow.ejs", { item, cart: cust.carts.length,reviews });
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

// add to cart
app.post("/homepage/signUp/:id/cart", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  if (cookies.userToken) {
    try {
      let { id } = req.params;
      const productType=req.query.productType;
      console.log("Req Query= ",productType);

      // find Who login
      const cookies = req.headers.cookie
        ? cookie.parse(req.headers.cookie)
        : {};

      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }

      let item = await Item.findById(id);
      if(item===null){
        // res.send(`<h3 style="color:red">Currently Out of Stock</h3>`);
        res.render("outOfStock.ejs", {productType,cart:cust.carts.length});
      }
      else {
        let newItem = new Cart({
          itemID: id,
          type: item.type,
          title: item.title,
          description: item.description,
          specification: item.specification,
          image: item.image,
          brand: item.brand,
          color: item.color,
          warranty: item.warranty,
          reviews: item.reviews,
          price: item.price,
        });
  
        cust.carts.push(newItem);
        await newItem.save();
        let result = await cust.save();
        console.log(result);
        res.redirect("/homepage/signUp/cart");
      }
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

// show cart
app.get("/homepage/signUp/cart", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  if (cookies.userToken) {
    try {
      // find Who login
      const cookies = req.headers.cookie
        ? cookie.parse(req.headers.cookie)
        : {};

      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }

      let items = await Customer.find({ username: cust.username }).populate(
        "carts"
      );
      
      let Items = items[0];
      console.log("items in cart= ", Items);
      // calculate price
      let price = 0;
      for (item of Items.carts) {
        price = price + item.price;
      }
      if (cust.carts.length)
        res.render("cart.ejs", {
          cart: cust.carts.length,
          Items,
          totalPrice: price,
        });
      else res.render("emptyCart.ejs",{cart:cust.carts.length});
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

// delete from cart
app.delete("/homepage/:id/carts/:cartId", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
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
  } else res.redirect("/homepage/login");
});

// buy route

app.get("/homepage/signUp/:id/confirmBuy", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    try {
      let { id } = req.params;
      const productType=req.query.productType;
      console.log("REq query= ",productType);
        // find who login
        let customers = await Customer.find({});
        let cust;
        for (customer of customers) {
          if (customer.username == cookies.username) {
            cust = customer;
          }
        }

      let item = await Item.findById(id);
      if(item===null){

        // res.send(`<h3 style="color:red">Currently Out of Stock</h3>`);
        res.render("outOfStock.ejs",{productType,cart:cust.carts.length});
      }
      else{    
          res.render("confirmBuy.ejs", { cart:cust.carts.length, item });
      }
      
      
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

app.post("/homepage/signUp/:id/buy", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  let { paymentMethod,quantity } = req.body;
  

  if (cookies.userToken) {
    if (paymentMethod === "COD") {
      try {
        let { id } = req.params;

        // find Who login

        let customers = await Customer.find({});
        let cust;
        for (customer of customers) {
          if (customer.username == cookies.username) {
            cust = customer;
          }
        }
        if (cust.address) {

          let shippingDay,month,orderMonth,year,expectedDelivery,orderDate,todayDay;          

           todayDay = new Date().getDate();
           month = new Date().getMonth() + 1;
           orderMonth=month;
           year = new Date().getFullYear();

           do{
            shippingDay = Math.floor(Math.random() * 37) + 1;
            if(todayDay>23 && shippingDay>30){ 
              shippingDay=shippingDay-30;
              month=month+1;
              break;
            }
           }while(!(shippingDay>=todayDay+5 && shippingDay <= todayDay+7)); // day should be >= purchaseDay+5 && <= purchaseDay+7


           // convert todayDay, month and shippingDay to its appropriate format
           todayDay = todayDay<10?("0"+todayDay):todayDay;
           month = month<10?("0"+month):month;
           orderMonth = orderMonth<10?("0"+orderMonth):orderMonth;
           shippingDay = shippingDay<10?("0"+shippingDay):shippingDay;

           orderDate= "Order Date: " + todayDay + "/" + orderMonth + "/" + year;            
                               
           expectedDelivery = "Expected Delivery: " + shippingDay + "/" + month + "/" + year;
          

         
          let item = await Item.findById(id);
          console.log("buy through item",item);


          //  add loop for quantity
          for (let i = 1; i <= quantity; i++) {
            let newOrder = new Order({
              itemID: id,
              title: item.title,
              type: item.type,
              description: item.description,
              specification: item.specification,
              brand: item.brand,
              color: item.color,
              warranty: item.warranty,
              reviews: item.reviews,

              orderName: item.description,
              orderImage: item.image,
              orderPrice: item.price,
              expectedDelivery: expectedDelivery,
              orderDate: orderDate,
              orderAddress: cust.address,
              customerName: cust.username,
              mobNo: cust.mobNo,
              status: "Pending",
            });
            await cust.orders.push(newOrder);
                   
            await newOrder.save();
            await cust.save();
  
          }
         
          res.redirect(`/loginHomepage/signUp/orderSuccess/${id}`);
        } else res.redirect("/loginHomepage/addresses");
      } catch (err) {
        next(err);
      }
    } else
      res.send(
        "<h2 style='color:red;'>Payment Gateway is under construction</h2>"
      );
  } else res.redirect("/homepage/login");
});

app.get("/loginHomepage/signUp/orderSuccess/:id", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};   
       
  let { id } = req.params;

  if (cookies.userToken) {
    try {
      // find who login
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }


      let item = await Item.findById(id);
      if (item === null) item = await Cart.findById(id);
       
      res.render("orderSuccess.ejs", { cart:cust.carts.length,item, cust });
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});



// All orders
app.get("/homepage/signUp/orders", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    try {
      // find Who login
      const cookies = req.headers.cookie
        ? cookie.parse(req.headers.cookie)
        : {};

      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }
      let order = await Customer.find({ username: cust.username }).populate(
        "orders"
      );
      let Orders = order[0];
      console.log("Orders= ", Orders);
      if (cust.orders.length)
        res.render("orders.ejs", { Orders, cart: cust.carts.length });
      else res.render("emptyOrder.ejs",{cart:cust.carts.length});
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

app.get("/homepage/signUp/:id/:ID", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    try {
      let { id, ID } = req.params;

       // find who login
       let customers = await Customer.find({});
       let cust;
       for (customer of customers) {
         if (customer.username == cookies.username) {
           cust = customer;
         }
       }
      let item = await Order.findById(id);
      console.log("item= ", item);
         
      res.render("orderDetails.ejs", { cart:cust.carts.length, item, ID });
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

// cancel orders
app.get("/homepage/signUp/:id/cancelOrder/:orderId", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    try {
      let { id, orderId } = req.params;
      await Customer.findByIdAndUpdate(id, { $pull: { orders: orderId } });
      await Order.findByIdAndDelete(orderId);

      // find who login
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }

      res.render("orderCancel.ejs",{cart:cust.carts.length});
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

// review route
app.post("/homepage/signUp/:id/Review",async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    try {
      let { id } = req.params;
      // find who login
      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }
  
      console.log("customer= ",cust);
      let item = await Item.findById(id);
      console.log("item from review= ", item);
      res.render("review.ejs", { item,cart:cust.carts.length });
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

app.post("/homepage/signUp/:itemID/submitReview",async(req,res,next)=>{
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    if (cookies.userToken) {
        try {
          let { itemID } = req.params;
          let { review, rating } = req.body;
        
          // add review and rating to item
          let item = await Item.findById(itemID);
          let newReview = new Review({
            itemID: item._id,
            username: cookies.username,
            review: review,
            rating: rating,
            date: new Date().getDate()+"/"+(new Date().getMonth()+1)+"/"+new Date().getFullYear(),
          });
          await newReview.save();
          item.reviews.push(newReview._id);          
          await item.save();
             
          res.redirect("/loginHomepage");
        } catch (err) {
          next(err);
        }
      }
      else res.redirect("/homepage/login");

});

// return to login(User) from Logout
app.get("/loginHomepage", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  // another way to access cookies but you should first set app.use(cookieParser()) as middleware
     console.log("cookies=",req.cookies);

  // console.log("loginCookies= ", cookies.userToken);
  if (cookies.userToken) {
    try {
      // find Who login
      const cookies = req.headers.cookie
        ? cookie.parse(req.headers.cookie)
        : {};

      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }

      let allItem = await Item.find({});
      res.render("loginHomepage.ejs", { allItem, cart: cust.carts.length });
    } catch (err) {
      next(err);
    }
        
  } else res.redirect("/homepage/login"); 
     

});

app.get("/loginHomepage/account", async (req, res, next) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  if (cookies.userToken) {
    // find Who login
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

    let customers = await Customer.find({});
    let cust;
    for (customer of customers) {
      if (customer.username == cookies.username) {
        cust = customer;
      }
    }
    res.render("account.ejs", {cart:cust.carts.length, cust });
  } else res.redirect("/homepage/login");
});

// searching items (homepage)
app.post("/homepage/searchResult", async (req, res, next) => {
  try {
    let { selectedCategory, customCategory } = req.body;
    let searchItem;
    const cookies=req.cookies;

    let allItem = await Item.find({});
    if (selectedCategory === "Other") {
      searchItem = allItem.filter((item) => item.title == customCategory);
    } else {
      searchItem = allItem.filter((item) => item.type == selectedCategory);
    }

    if (searchItem.length == 0) res.render("noSearchFound.ejs",{cookies});
    else {
      res.render("searches.ejs", { searchItem });
    }
  } catch (err) {
    next(err);
  }
});

// top deals route (homepage)
app.post("/homepage/topDeals/Explore", async (req, res, next) => {
  try {
    let { type } = req.body;
    const allItems = await Item.find({});
    const allItem = allItems.filter((item) => item.type === type);
    res.render("topDealHomepage.ejs", { allItem });
  } catch (error) {
    next(error);
  }
});

app.post("/loginHomepage/topDeals/Explore", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  if (cookies.userToken) {
    try {
      let { type } = req.body;
      // find Who login
      const cookies = req.headers.cookie
        ? cookie.parse(req.headers.cookie)
        : {};

      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }

      const allItems = await Item.find({});
      const allItem = allItems.filter((item) => item.type === type);
      res.render("topDealLoginHomepage.ejs", {
        allItem,
        cart: cust.carts.length,
      });
    } catch (error) {
      next(error);
    }
  } else res.redirect("/homepage/login");
});

// searching items (login Homepage)
app.post("/homepage/signUp/searchResult", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};

  if (cookies.userToken) {
    try {
      // find Who login
      const cookies = req.headers.cookie
        ? cookie.parse(req.headers.cookie)
        : {};

      let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }
      let { selectedCategory, customCategory } = req.body;
      let searchItem;
      let allItem = await Item.find({});
      if (selectedCategory === "Other") {
        searchItem = allItem.filter((item) => item.title == customCategory);
      } else {
        searchItem = allItem.filter((item) => item.type == selectedCategory);
      }

      if (searchItem.length == 0) res.render("noSearchFound.ejs",{cookies,cart:cust.carts.length});
      else {
        res.render("loginSearches.ejs", {
          searchItem,
          cart: cust.carts.length,
        });
      }
    } catch (err) {
      next(err);
    }
  } else res.redirect("/homepage/login");
});

// find similiar item 
app.get("/homepage/signUp/viewSimilar", async (req, res, next) => {
   const productType=req.query.productType;

   const cookies=req.cookies;
   if(cookies.userToken){

     // find who login
     let customers = await Customer.find({});
      let cust;
      for (customer of customers) {
        if (customer.username == cookies.username) {
          cust = customer;
        }
      }

     const allItem=await Item.find({});
     const similarItem=allItem.filter((item)=>item.type==productType);
     const searchItem=similarItem;
     if(searchItem.length==0){
       res.render("noSearchFound.ejs",{cookies,cart:cust.carts.length});
     }
     else{
       res.render("loginSearches.ejs",{searchItem,cart:cust.carts.length});
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
  const cookies=req.cookies;

  // another way to access cookies but for this method  you should first set app.use(cookieParser()) as middleware
  
   res.render("pageNotFound.ejs",{cookies});
});
