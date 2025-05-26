const postid = window.location.pathname.split('/').pop();

document.addEventListener('DOMContentLoaded', () => {
    fetch(`/post/${postid}/checklike`, {
        method: 'POST',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.gooded) {
                document.querySelector('#l1').src = '/img/gooded.png';
            } else if (data.success) {
                document.querySelector('#l1').src = '/img/good.png';;
            } else {
                alert(data.error);
            }
        })
        .catch(err => {
            console.error('按讚失敗：', err);
        });
    const fav = document.querySelector('#fav');
    if (!fav) return;


    fetch(`/get-user-favorites/${postid}`, {
        method: 'GET',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            if (data.if === 'yes') {
                fav.src = '/img/faved.png';
            } else {
                fav.src = '/img/fav.png';
            }
        })
        .catch(err => {
            console.error('取得收藏資料失敗', err);
        });
    fav.addEventListener('click', () => {
        fetch(`/favorite/${postid}`, {
            method: 'POST',
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    alert(data.error || '收藏失敗');
                    return;
                }
                fav.src = data.action === 'inserted' ? '/img/faved.png' : '/img/fav.png';
            })
            .catch(err => {
                console.error('收藏錯誤', err);
                alert('收藏時發生錯誤');
            });
    });
});

document.querySelector('#l1').addEventListener('click', () => {

    fetch(`/post/${postid}/like`, {
        method: 'POST',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.do) {
                img = document.querySelector('#l1');
                img.src = '/img/gooded.png';
                img.classList.add('like-animation');
                img.addEventListener('animationend', () => {
                    img.classList.remove('like-animation');
                }, { once: true });
                document.querySelector('#l2').innerHTML = parseInt(document.querySelector('#l2').innerHTML) + 1;
            } else if (data.success && !data.do) {
                img = document.querySelector('#l1');
                img.src = '/img/good.png';
                img.classList.add('like-animation');
                img.addEventListener('animationend', () => {
                    img.classList.remove('like-animation');
                }, { once: true });
                document.querySelector('#l2').innerHTML = parseInt(document.querySelector('#l2').innerHTML) - 1;
            }
            else {
                alert(data.error);
            }
        })
        .catch(err => {
            console.error('按讚失敗：', err);
        });
});

document.querySelector('#toper').addEventListener('click', () => {
    window.location.href = '/forum';
});
