# Movie search app 

***

## 프로젝트 소개
영화 검색 API(OMDB)를 사용하여 영화 정보를 검색하고, 이에 맞는 정보(영화 포스터, 제목, 감독, 줄거리 등)를 제공합니다.

***

## 파일구조
- 'app.js': 영화 검색 API 연동
- 'models/': 영화 정보를 저장하는 모델 파일 
- 'views/': 사용자에게 보여지는 HTML 구조
- 'public/': CSS, 이미지 폴더

  ***

## 코드 소개 

##### 1. app.js
   ```
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

- Express 를 사용하여 서버를 설정하고, 영화 검색 API (OMDB)를 호출하여
영화 정보를 렌더링 하는 라우터를 처리합니다.

- get / 경로에서는 기본 페이지를 렌더링합니다.
- ㅎㄷㅅ



