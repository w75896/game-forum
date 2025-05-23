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
});

document.querySelector('#l1').addEventListener('click', () => {

    fetch(`/post/${postid}/like`, {
        method: 'POST',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.do) {
                img=document.querySelector('#l1');
                img.src = '/img/gooded.png';
                img.classList.add('like-animation');
                img.addEventListener('animationend', () => {
                    img.classList.remove('like-animation');
                }, { once: true });
                document.querySelector('#l2').innerHTML = parseInt(document.querySelector('#l2').innerHTML) + 1;
            }else if (data.success && !data.do) {
                img=document.querySelector('#l1');
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

