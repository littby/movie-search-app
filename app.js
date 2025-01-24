const express = require('express');
const axios = require('axios');
require('dotenv').config();
const app = express();

const PORT = 3000;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

// EJS 설정
app.set('view engine', 'ejs');
app.use(express.static('public')); // 정적 파일 경로 설정

// 기본 페이지 렌더링
app.get('/', (req, res) => {
    res.render('index', { movie: null, error: null }); // 기본 페이지는 movie와 error를 null로 전달
});


// 영화 검색 API 연동
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
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
