const express = require('express')
const app = express();
const path = require('path');
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
app.set("view engine","ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const jwt = require('jsonwebtoken');
const { log } = require('console');
app.get('/',(req,res)=>{
res.render('index');

});
const isLoggedIn = (req,res,next)=>{
  if(!req.cookies.token){
  return res.redirect("/login");
   
  }else{
   let data =  jwt.verify(req.cookies.token,"shhhhh");
   req.user =data;
      next();

  }
}
app.get('/login',(req,res)=>{
    res.render('login');
})
app.get('/profile',isLoggedIn,async (req,res)=>{
 let user= await userModel.findOne({email:req.user.email}).populate("posts");
  res.render("profile", { user, posts: user.posts });

 

  
})
app.get('/like/:id', isLoggedIn, async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);
    const userId = req.user.userId; // use the same key you stored in JWT

    // Ensure the post exists
    if (!post) {
      return res.status(404).send("Post not found");
    }

    // Check if user has already liked the post
    const likeIndex = post.likes.findIndex(like =>
      like && like.toString() === userId.toString()
    );

    if (likeIndex > -1) {
      // User has already liked → Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // User hasn't liked → Like
      post.likes.push(userId);
    }

    await post.save();
    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    res.redirect('/profile');
  }
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({_id:req.params.id}).populate("user");
  res.render('edit',{post})
  
});
app.post('/update/:id', isLoggedIn, async (req, res) => {
  await postModel.findByIdAndUpdate(req.params.id,{content:req.body.content});
  res.redirect("/profile");
  
});
app.post('/post',isLoggedIn,async (req,res)=>{
 let user= await userModel.findOne({email:req.user.email});
 let {content}=req.body;
let post = await postModel.create({
user:user._id,
    
     content:content
     
 });
 
  user.posts.push(post._id);
    
await user.save();
res.redirect("/profile");
  
  
})
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) return res.status(400).send("User not registered");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Incorrect password"); // stop here

    // Only generate token if password is correct
    const token = jwt.sign({ email: user.email, userId: user._id }, "shhhhh");
    res.cookie("token", token);
    return res.redirect("/profile");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});
app.get('/logout',(req,res)=>{
    res.cookie("token","");
    res.render("login")
})
app.post('/register', async (req,res)=>{
    let {email,password,username,name,age}=req.body;
   let user = await userModel.findOne({email});
   if(user) return res.status(500).send("User already registered");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);
    const newUser = await userModel.create({
        username,
        email,
        age,name,password:hashedPassword
    });
   const token = jwt.sign({email:newUser.email,userId:newUser._id},"shhhh");
   res.cookie("token",token);
   res.send("Registered")
   
});

app.listen(3000);