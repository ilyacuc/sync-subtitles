import { parse } from 'subtitle';

function msToTime(s) {

    // Pad to 2 or 3 digits, default is 2
    function pad(n, z) {
        z = z || 2;
        return ('00' + n).slice(-z);
    }

    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;

    return pad(hrs) + ':' + pad(mins) + ':' + pad(secs) + '.' + pad(ms, 3);
}

const TRASHOLD = 1000;
const readFileAsText = (inputFile) => {
    const temporaryFileReader = new FileReader();

    return new Promise((resolve, reject) => {
        temporaryFileReader.onerror = () => {
            temporaryFileReader.abort();
            reject(new DOMException("Problem parsing input file."));
        };

        temporaryFileReader.onload = () => {
            resolve(temporaryFileReader.result);
        };
        temporaryFileReader.readAsText(inputFile);
    });
};

function normalizeArrays(arr1, arr2) {
    arr1.forEach(({ start, end }) => {
        const match = arr2.find(item => {
            return start >= item.start - TRASHOLD && start <= item.start + TRASHOLD && end >= item.end - TRASHOLD && end <= item.end + TRASHOLD;
        });

        if (!match) {
            arr2.push({ start, end, text: '' });
        }
    })

    arr2.sort((a, b) => a.start - b.start);
}

let files = [];

function onFileChange(e) {

    let arr1 = [];
    let arr2 = [];

    if (e.target.files.length >= 2) {
        files = [...e.target.files];
    } else {
        files.push(...e.target.files);
    }

    if (files.length >= 2) {
        readFileAsText(files[0])
            .then(result => {
                arr1 = parse(result);
                return readFileAsText(files[1])
            })
            .then(result => {
                    arr2 = parse(result);

                    normalizeArrays(arr1, arr2);
                    normalizeArrays(arr2, arr1);
                    console.log(arr1, arr2);
                    render(arr1, arr2);
                }
            )
    }
    e.target.value = '';
}

let startTs = 0;
let offset = 47297;
let intervalId;
const timingNodes = [];
let timingNodesInversed;
let textElements;
let isScrolling = false;
let isPlaying = false;

function render(arr1, arr2) {
    const fragment = document.createDocumentFragment();
    arr1.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'time';
        el.id = 'time_' + index;
        el.innerText = msToTime(item.start);
        const text = document.createElement('div');
        text.className = 'text';
        text.innerHTML = `<span>${item.text}</span><span>${arr2[index].text}</span>`;
        fragment.append(el, text);
        timingNodes.push({ element: el, start: item.start });
    })

    timingNodesInversed = [...timingNodes].reverse();
    textElements = [...document.querySelectorAll('.text')];
    document.getElementById('app').append(fragment);
    console.log(timingNodesInversed);
}

function onPlayClick() {
    if (!timingNodes.length) {
        return;
    }
    isPlaying = true;
    startTs = new Date().getTime() - offset;
    intervalId = window.setInterval(loop, 1000);
}

function onStop() {
    console.log('stop');
    isPlaying = false;
    window.clearInterval(intervalId);
}

function loop() {
    isScrolling = false;
    const position = new Date().getTime() - startTs;
    const item = timingNodesInversed.find(({ start }) => position >= start);
    console.log(position, offset, item);
    if (item && offset !== item.start) {
        offset = item.start;
        isScrolling = true;
        item.element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        item.element.nextElementSibling.classList.add('active');

    }
}

function clearActive() {
    textElements.forEach(element => element.classList.remove('active'));
}

function onScroll(e) {
    if (isScrolling) {
        return;
    }
    let shouldRestart = isPlaying;
    //clearActive();
    console.log(e);
    if (isPlaying) {
        onStop();
    }
    const item = timingNodesInversed.find(({ element }) => {
        const top = element.getBoundingClientRect().top;
        return top > 0 && top < window.innerHeight / 2;
    });
    if (item) {
        console.log(item);
        offset = item.start;
        item.element.nextElementSibling.classList.add('active');
    }
    if (shouldRestart) {
        onPlayClick();
    }
}

document.getElementById('file').addEventListener('change', onFileChange);
document.getElementById('play').addEventListener('click', onPlayClick)
document.getElementById('pause').addEventListener('click', onStop)
window.addEventListener('touchstart', () => isScrolling = false)
window.addEventListener('scroll', onScroll);