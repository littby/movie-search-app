document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.bookmark-btn').forEach(button => {
        button.addEventListener('click', async function() {
            console.log('북마크 버튼 클릭됨:', button.dataset.title);
            const movieTitle = button.dataset.title;

            try {
                const response = await fetch('/bookmark', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movieTitle })
                });
                const data = await response.json();
                
                // 서버 응답에 따라 버튼 텍스트 및 data-bookmarked 속성 업데이트
                if (data.isBookmarked) {
                    button.innerHTML = '❤️';
                    button.setAttribute('data-bookmarked', 'true');
                } else {
                    button.innerHTML = '🤍';
                    button.setAttribute('data-bookmarked', 'false');
                }
            } catch (error) {
                console.error('북마크 처리 중 오류:', error);
            }
        });
    });
});
