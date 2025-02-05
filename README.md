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

문제: 리뷰를 작성한 후에만 기존 리뷰들이 보여짐
해결: **GET /search**에서도 기존 리뷰를 불러올 수 있도록 함. 
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

  





