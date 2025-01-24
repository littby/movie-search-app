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
  





