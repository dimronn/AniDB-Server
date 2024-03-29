const midtransClient = require("midtrans-client");
const axios = require('axios')
const bcrpyt = require('bcryptjs')
    const jwt = require("jsonwebtoken")
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandlers");
const {User, Bookmark} = require("./models/index");
const authenticatePub = require("./middlewares/authenticationPub");
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());


app.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.create({
      username,
      email,
      password,
    });
    console.log(user);
    res.status(201).json({
      message: `User with id ${user.id} has been created`,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    if (!email) {
      throw { name: "null email" };
    }
    if (!password) {
      throw { name: "null password" };
    }
    const user = await User.findOne({
      where: {
        email: email,
      },
    });
    if (!user) {
      throw { name: "null user" };
    }

    const isCorrectPassword = bcrpyt.compareSync(password, user.password);
    if (!isCorrectPassword) {
      throw { name: "incorrect password" };
    }
    const access_token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    console.log(access_token);
    res.status(200).json({
      access_token: access_token,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

app.get('/getanime', async (req, res, next) => {
  try {

    console.log(req.query)
    let page = req.query.page
    let genre = req.query.genre
    let title = req.query.title
    if (!page) { page = 1 }
    if(!genre) {genre = ''}
    if(!title) {title = ''}
    
  const data = await axios({
     method: 'GET',
    url: `https://api.jikan.moe/v4/anime`,
    params: {
      sfw: 'true',
      type: 'tv',
      genres: genre,
      page: page,
      q: title,
      order_by: "popularity"
      }
  })
  // console.log(data.data)
    res.status(200).json({
data:data.data
})
  } catch (error) {
    console.log(error)
    next(error)
  }

})

app.get('/getanimeById/:mal_id', async (req, res, next) => {
  try {
    const mal_id = req.params.mal_id
  const data = await axios({
     method: 'GET',
    url: `https://api.jikan.moe/v4/anime/${mal_id}`,
  })
  // console.log(data.data)
    res.status(200).json({
data:data.data
})
  } catch (error) {
    console.log(error)
    next(error)
  }

})
app.use(authenticatePub)
app.patch("/member", async (req, res, next) => {
  try {
    const id = req.user.id;
    const update = await User.update(
      {
        member: "member",
      },
      {
        where: {
          id: id,
        },
      }
    );
    res.status(201).json({
      message: "You have become a member",
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.post("/tokenformember", async (req, res, next) => {
  try {
    const id = req.user.id
    const user = await User.findByPk(id)
    console.log(user)
    if (user.member === "member") { 
      
      throw {name: "already a member"}
    }
    // Create Snap API instance
    let snap = new midtransClient.Snap({
      // Set to true if you want Production Environment (accept real transaction).
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY
    });

    let parameter = {
      transaction_details: {
        order_id: Math.floor(1000000 + Math.random()*1000000),
        gross_amount: 10000,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        email:user.email
      },
    };

    const transaction = await snap.createTransaction(parameter);
    console.log(transaction)

    res.status(201).json({
      transaction
    })
  } catch (error) {
    console.log(error)
    next(error)
  }
});

app.post('/bookmark/:animeId', async (req, res, next) => {
  try {
    const id = req.user.id
    const animeId = req.params.animeId
    const dataMal = await axios({
      method: 'get',
      url: `https://api.jikan.moe/v4/anime/${animeId}`
    })
    // console.log(dataMal.data)
    const image = dataMal.data.data.images.jpg.image_url
    const trailer = dataMal.data.data.trailer.embed_url
    const title = dataMal.data.data.title_english
    const status = dataMal.data.data.status
    const score = dataMal.data.data.score
    const synopsis = dataMal.data.data.synopsis
    const rating = dataMal.data.data.rating
    const genre = dataMal.data.data.genres
    // console.log( image, trailer,title, status, score, synopsis, genre)
    const bookmark = await Bookmark.create({
      userId: id,
      animeId: animeId,
      image: image,
      trailer: trailer,
      title: title,
      status: status,
      score: score,
      synopsis: synopsis,
      rating:rating,
      genre:genre
    })
    // console.log(bookmark)
    res.status(201).json({
      message: `Anime with MAL ID ${animeId} sucessfully bookmarked`,
    })
  } catch (error) {
    console.log(error)
    next(error)
  }
 })

app.get('/bookmarks', async (req, res, next) => {
  try {
    const id = req.user.id
    const bookmarks = await Bookmark.findAll({
      where: {
      userId : id
      }
    })

    res.status(200).json({
      bookmarks
      
    })
  } catch (error) {
    console.log(error)
    next(error)
  }
})

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
module.exports = app;
