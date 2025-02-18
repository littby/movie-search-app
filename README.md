# Movie search app 

***

## 프로젝트 소개
영화 검색 API(OMDB)를 사용하여 영화 정보를 검색하고, 이에 맞는 정보(영화 포스터, 제목, 감독, 줄거리 등)를 제공합니다.

***

## 파일구조
- **'app.js'**: 영화 검색 API 연동
- **'models/'**: 영화 정보를 저장하는 모델 파일 
- **'views/'**: 사용자에게 보여지는 HTML 구조
- **'public/'**: CSS, 이미지 폴더
  

  ***

## 코드 소개 

### 1. app.js
   
#### 1.1 홈페이지 렌더링 
- *get '/'* 경로에서는 기본 페이지를 렌더링 합니다.
```javascript
  app.get('/', (req, res) => {
    res.render('index', { movie: null, error: null });
```

 #### 1.2 영화검색
- *get '/search'* 경로에서는OMDB API를 통해 영화 검색 기능을 처리합니다.
- 에러 발생 시 사용자에게 메세지를 보여줍니다. 

```javascript
app.get('/search', async (req, res) => {
    const movieTitle = req.query.title;
    if (!movieTitle) {
        return res.render('index', { movie: null, error: '영화 제목을 입력해주세요.' });
    }

    try {
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${movieTitle}`);
        if (response.data.Response === 'False') {
            return res.render('index', { movie: null, error: '해당 영화의 정보가 없습니다.' });
        }
        res.render('index', { movie: response.data, error: null });
    } catch (error) {
        console.error(error);  // 콘솔에 에러 출력
        res.render('index', { movie: null, error: '영화 정보를 가져오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.' });
    }
});
```

#### 1.3 리뷰작성&저장 
- 사용자가 입력한 영화 제목, 평점, 리뷰 내용을 받아 POST '/review' 경로로 전송됨
- 입력된 리뷰는 MongoDB에 저장됨 
- 리뷰 저장이 완료되면 해당 영화 정보를 가져오고, 저장된 리뷰와 함께 화면에 표시  

```javascript
app.post('/review', async (req, res) => {
    const { movieTitle, rating, comment } = req.body;

    try {
        // Review 모델을 사용하여 새로운 리뷰 객체를 생성 
        const newReview = new Review({
            movieTitle,
            rating,
            comment
        });
        await newReview.save(); // MongoDB의 Review에 저장 
        console.log("✅ 리뷰 저장 완료:", newReview);

        // OMDB API를 호출하여, 영화 제목에 해당하는 영화 정보를 다시 가져옴 
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${movieTitle}`);

        // 영화 정보와 모든 리뷰를 렌더링
        res.render('index', { movie: response.data, reviews: reviews, error: null });

    } catch (error) {
        console.error("❌ 리뷰 저장 오류:", error);
        res.redirect(`/search?title=${movieTitle}&error=리뷰 저장 실패`);
    }
});
```

- 문제:
  리뷰를 작성한 후에만 기존 리뷰들이 보여짐
- 해결:
   **GET /search**에서도 기존 리뷰를 불러올 수 있도록 함. 
사용자가 리뷰를 작성하지 않더라도, 영화 검색 시 기존 리뷰가 보이도록 수정함 

**수정한 코드**  
```javascript
...
 try {
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${movieTitle}`);
        if (response.data.Response === 'False') {
            return res.render('index', { movie: null, error: '해당 영화의 정보가 없습니다.', reviews: [] });
        }
 **const reviews = await Review.find({ movieTitle });** // 해당 코드를 추가 
res.render('index', { movie: response.data, error: null, reviews: reviews });
...
```

#### 1.4 리뷰 작성자 표시 기능 
```javascript
app.post('/review', async (req, res) => {
    const { movieTitle, rating, comment, author } = req.body;
// author를 추가
```

#### 1.5 리뷰 삭제 기능 

```javascript
app.post('/review/delete', async (req, res) => {
   // 삭제할 Id 값과 영화 제목을 가져옴 
    const { reviewId, movieTitle } = req.body;
    console.log('삭제하려는 영화 제목:', movieTitle);

    try {
        // MongoDB에서 리뷰를 삭제
        await Review.findByIdAndDelete(reviewId);
        console.log(`✅ 리뷰 삭제 완료: ${reviewId}`);

       // 리뷰를 삭제한 후 /search 페이지로 리디렉션함. 
        res.redirect(`/search?title=${movieTitle}`);

    } catch (error) {
        console.error("❌ 리뷰 삭제 오류:", error);
        res.redirect(`/search?title=${movieTitle}&error=리뷰 삭제 실패`);
    }
});
```
- 발생한 에러
  
  : 기본 HTTP 메소드에서는 GET과 POST만을 지원함 -> DELETE 방식이 처리되지 않음. 
- 해결방법
  
  : **method-override** 를 추가해, **DELETE 요청**을 처리할 수 있게 함. 

```terminal
npm install method-override
```


```javascript
import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv'; 
import methodOverride from 'method-override'; 
import Review from './models/Review.js';
...

// method-override 설정
app.use(methodOverride('_method'));
...
```

#### 1.6 리뷰 공감버튼, 비공감버튼 API 
- 리뷰데이터 형식에 likes(공감), dislikes(비공감) 설정 

```javascript Review.js 
likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    }
```
- id를 받아 좋아요와 싫어요를 증가시킨 다음 데이터베이스에 저장 

```javasctipt 
// POST 요청을 받으며, 공감버튼을 누를 때 동작 
app.post('/review/like/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        review.likes += 1; //공감 수를 1 증가시킴 
        await review.save(); //리뷰데이터 저장 

       // 리뷰페이지로 돌아가, 공감수가 증가한 상태로 렌더링함.
      // 'back' 은 이전 페이지로 돌아가는 기능 
        res.redirect('back'); 
    } catch (error) { //예외처리 
        console.error("공감버튼 오류:", error);
        res.redirect('back'); // 에러가 나도 다시 같은 페이지로
    }
});

// 비동의버튼 
app.post('/review/dislike/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        review.dislikes += 1;
        await review.save();
        
        res.redirect('back'); 
    } catch (error) {
        console.error("비동의 버튼 오류:", error);
        res.redirect('back'); 
    }
});
```

#### 1.7 리뷰 별점 총합 계산

- 영화 제목({movieTitle})에 해당하는 리뷰들을 조건으로 데이터베이스에서 가져온 후, 영화에 대한 모든 리뷰가 reviews 배열에 저장됩니다. 
```javascript 
const reviews = await Review.find({ movieTitle });
```





- 별점 총합을 계산할 때, 각 리뷰마다 rating 속성이 있는 것을 활용해, 값들을 모두 더해 구합니다.
- 이때 javascript 의 reduce 메소드를 활용합니다. 또한 모든 리뷰의 총합을 totalRating에 저장합니다.
   
**acc** : 별점의 누적값이며, 초기값을 0으로 설정합니다.

**Number(review.rating)** : rating 속성이 문자열일 수 있으므로 Number 속성으로 변경합니다.
```javascript
const totalRating = reviews.reduce((acc, review) => acc + Number(review.rating), 0);
```




- 평균 별점을 계산합니다. 총합(totalRating)을 리뷰 개수로 나눕니다.
- 조건부 연산자를 활용하여 reviews.length가 0이 아니라면, 계산을 진행합니다. 만약 리뷰가 존재하지 않다면, null을 반환합니다.

**reviews.length ? (totalRating / reviews.length).toFixed(1) : null;**

**toFixed(1)** : 소수점 한 자리까지 표현합니다. 
```javascript
const avgRating = reviews.length ? (totalRating / reviews.length).toFixed(1) : null;
``` 




- 렌더링(출력)을 할 때, 즉 res.render 함수에 avgRating 변수를 추가합니다. 템플릿에서 avgRating 변수를 사용해 해당 영화에 평균 별점을 표시할 수 있습니다. 
```javascript
res.render('index', { 
            movie: response.data, 
            reviews: reviews, 
            error: null,
            avgRating: avgRating });
``` 

#### 1.8 리뷰 수정 코드 

- **PUT** 요청을 받아서 내용을 수정합니다.  
```javascript
app.put('/review/:id', async (req, res) =>
```

- id 값을 가져와 reviewId 변수에 저장한 뒤, 사용자가 입력한 rating 과 comment를 가져옵니다.
  
``` javascrpit
const reviewId = req.params.id;
const { rating, comment } = req.body;
``` 

- findByIdAndUpdate() 메소드를 사용합니다.
- MongoDB에 리뷰를 찾아 rating, comment를 업데이트합니다. 
```javascript
const updatedReview = await Review.findByIdAndUpdate(
            reviewId, 
            { rating, comment }, 
            { new: true } 
```
- 리뷰 수정이 끝났다면 원래 영화페이지로 돌아갑니다.
  
```javascript
res.redirect(`/search?title=${updatedReview.movieTitle}`);
```
#### 1.9 리뷰 공감순으로 설정 
- *app.get('/search')* 에서 **.sort()** 를 사용하여 공감 수가 많은 순서대로 리뷰를 표시합니다. 
- -1 : 내림차순, 1 : 오름차순

**수정 전**  
```javascript
const reviews = await Review.find({ movieTitle })
```

**수정 후**
```javascript
const reviews = await Review.find({ movieTitle }) .sort({ likes: -1 }) 
```

#### 1.10 북마크 기능 
- 영화의 북마크 버튼을 누르면 호출되는 기능입니다. 

- POST 요청을 보내면 데이터에서 movieTitle을 추출합니다. (예를 들어 {"movieTitle":"Zootopia"} 를 보낸다면, movieTitle 에 "Zootopia"가 저장됩니다.)  
- MongoDB에서 Bookmark 를 조회하여, **findOne**을 사용해 영화제목이 일치하는지 확인 합니다.
- **if** : 만약 이미 북마크가 있다면 **deleteOne**을 사용해 북마크를 삭제합니다. 이후 JSON 응답으로 { message: '북마크 삭제됨', isBookmarked: false }를 보냅니다.
- **else** : 북마크가 있지 않다면, create 를 사용해 새로운 북마크를 생성합니다. 이후JSON 응답으로 { message: '북마크 추가됨',isBookmarked: true } 를 보냅니다.
  
```javascript
app.post('/bookmark', async (req, res) => {
    const { movieTitle } = req.body;

    try {
        const bookmark = await Bookmark.findOne({ movieTitle: movieTitle });

        if (bookmark) {
            await Bookmark.deleteOne({ movieTitle: movieTitle }); // 이미 있으면 삭제 (토글 기능)
            return res.json({ message: '북마크 삭제됨',isBookmarked: false });
        } else {
            await Bookmark.create({ movieTitle: movieTitle });
            return res.json({ message: '북마크 추가됨',isBookmarked: true });
        }
    } catch (error) {
        console.error('❌ 북마크 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});
```


- 북마크된 영화 목록을 볼 때 호출되는 기능입니다.
- **Bookmark.find()**를 사용해 MongoDB의 Bookmark에 있는 (북마크 된) 영화 제목들을 가져옵니다.
- res.render('bookmarks', { bookmarks }); 를 사용하여 bookmarks.ejs 템플릿에 전달합니다. 전달 받은 bookmarks 데이터를 사용해 북마크된 영화 목록을 화면에 표시합니다. 
```javascript
app.get('/bookmarks', async (req, res) => {
    try {
        const bookmarks = await Bookmark.find();
        res.render('bookmarks', { bookmarks });
    } catch (error) {
        console.error('❌ 북마크 목록 불러오기 오류:', error);
        res.status(500).send('북마크 목록을 가져올 수 없습니다.');
    }
});

```

*** 


#### 2.1 Express 초기화 및 기본설정 
- **Express** 라이브러리를 불러와 라우팅, 미들웨어 등을 쉽게 처리할 수 있게끔 합니다. 
```javascript
const express = require('express');
const axios = require('axios');
require('dotenv').config();
const app = express();
```


#### 2.2 서버포트 설정 및 뷰 엔진 설정(EJS 사용)
- **EJS** 템플릿 엔진을 사용하면 HTML 안에서 JavaScript 코드를 동적으로 렌더링할 수 있습니다.
```javascript
const PORT = 3000;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

app.set('view engine', 'ejs');
app.use(express.static('public')); 
```

***

#### 3.1 MongoDB에 저장될 리뷰데이터 형식 
```javascript
import mongoose from 'mongoose';

// 리뷰 데이터 형식 정의 
const reviewSchema = new mongoose.Schema({
    movieTitle: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    comment: {
        type: String,
        required: true,
    },
});

// 리뷰 모델 생성
const Review = mongoose.model('Review', reviewSchema);

export default Review; 
```

***
#### 4.1 북마크 스키마 정의 
- 영화 제목은 반드시 있어야하고(required), 같은 영화가 중복으로 북마크 되지 않도록 합니다.(unique)
```javascript
import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
    movieTitle: { 
        type: String, 
        required: true, 
        unique: true }
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema); 

export default Bookmark;
```
***

#### 5.1 기타 
- 리뷰데이터를 랜덤으로 생성 후 **MongoDB Compass** 를 사용해 리뷰 100개를 업로드했습니다.
- JSON 형식의 파일을 Add Data 기능을 활용해 삽입했습니다.
- 리뷰를 작성한 영화는 다음과 같습니다. 

*Zootopia*

*The Avengers*

*Despicable Me*

*Kung Fu Panda 4*

*Elemental* 

  





