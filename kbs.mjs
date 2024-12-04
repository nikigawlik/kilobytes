const PI = Math.PI;
let random = Math.random;
let randS = () => ((random() - random()) / 2);
let sign = Math.sign;
let sin = Math.sin;
let sn = t => sin(t * 2 * PI);
let max = Math.max;
let atan = Math.atan;

let _r = 0;
let rantb = (t, b) => t%b == 0? (_r = randS()) : _r; 

// props

/** @type AudioContext */ let ctx;
/** @type GainNode */ let master;

function init() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.setValueAtTime(0.5, ctx.currentTime); // keep it civil!
    master.connect(ctx.destination);
}

async function perform() {
    await track1();
}

async function track1() {
    const srate = 44100;
    const length = 1 << 20;

    let buffer = ctx.createBuffer(1, length, srate);
    let data = buffer.getChannelData(0);

    // --- //
    
    for(let i = 0; i < length; i++) {
        let t = i
        // t = i & 0xffffefa7;

        // drum beat
        let bt = t % (1<<13);
        let rbt = bt / (1<<15);
        let hit = bt < (1<<10)? rantb(t, 3) * (0.001/(rbt+0.01)) : 0;

        let kbt = t % (1<<(15)) / (1<<(15));
        let kick = (0.02/(kbt+0.01))**2 * sn(sn(kbt * (3<<2))) * 0.25;

        // bass line
        let vari = (t>>16)%16 < 8? 2 : 3
        let vari2 = (t>>16)%16 < 8? 2/3 : 7/9
        let prog = [1/2, 3/4, 2/3, vari2, (5+2-vari)/9, 7/9, 2/3, vari/4][(t>>16)%8];
        let len = [2, 1, 2, 2, 4, 1, 2, 2][(t>>16)%8];
        let rbb = t % (1<<(12+len)) / (1<<(12 + len));
        let rbb2 = t % (1<<(12+4)) / (1<<(12+4));
        let rbb3 = t % (1<<(12+3)) / (1<<(12+3));
        let bass = 
            (1-rbb)**3 
            * sn(rbt * (1<<5) * prog)**12 
            * .7
            * (1 - rbb3*.25 - rbb2*.25)**3 ;

        // harmony
        let hrog1 = [1, 2/3, 5/9, 2/3][(t>>18)%4]; // higher
        let hrog2 = [2/3, 5/9, 2/3, 1/2][(t>>18)%4]; // lower
        // let len = [2, 1, 2, 2, 4, 1, 2, 2][(t>>16)%8];
        let rht = t % (1<<(18)) / (1<<(18));
        let hum1 = (1-rht)**3 * sn(rht**0.999 * (1<<10) * hrog1)**12 * .5;
        let hum2 = (1-rht)**3 * sn(rht**0.999 * (1<<9) * hrog2)**12 * .5;

        // cool random synth
        // let hrog = [1, 2/3, 5/9, 2/3][(t>>18)%4];
        // // let len = [2, 1, 2, 2, 4, 1, 2, 2][(t>>16)%8];
        // let rht = t % (1<<(18)) / (1<<(18));
        let hum3 = (1-rht)**3 * sn(rht * (1<<7) * hrog1)**12 * .5;
        let hum4 = (1-rht)**3 * sn(rht * (1<<6) * hrog1)**12 * .5;

        // fx
        // let reverb = (t > (1<<17)? data[t-(1<<10)] * 0.3 : 0);
        const rv = 1;
        let reverb = (t > rv? data[t-rv] * 0.6 : 0);

        
        let losc1 = max( (t>>25)%2, 1 );
        let losc2 = max( (t>>24)%4, 1 );
        let losc3 = max( (t>>23)%3, 1 );


        data[t] = 0
            + hit
            + kick 
            + bass 
            + (hum1 + hum2) * losc3
            + (hum3 + hum4) * losc2
            // + reverb
        ;

        
    }
    
    // --- // 

    
    let musicSource = ctx.createBufferSource();
    musicSource.buffer = buffer;
    musicSource.loop = true;
    
    musicSource.connect(master);
    musicSource.start();
    
    // let speakers = [
        //     { lang: 'en-US',    interval: bfreq*2 + Math.random() * 6000 },
        //     { lang: 'en-UK',    interval: bfreq*2 + Math.random() * 6000 },
        //     { lang: 'de',       interval: bfreq*1 + Math.random() * 6000 },
        //     { lang: 'fr',       interval: bfreq*1 + Math.random() * 6000 },
        // ];
        
    speechSynthesis.getVoices(); // chrome bug
    await new Promise((resolve, reject) => window.setTimeout(resolve, 200));

    let speakers = speechSynthesis.getVoices().map(voice => ({
        lang: voice.lang,
        interval: 1200 * (Math.random() + 1),
    }));
    // normalize for number of speakers
    for(let speaker of speakers) {
        speaker.interval *= speakers.length;
    }

    document.body.querySelector("footer>textarea").value = (speakers.map(sp => `${sp.lang}, ${sp.interval}`).join("\n\n"));

    let words = [
        "void",
        "destruction",
        "blood",
        "elimination",
        "pain",
        "dissolve",
        "into",
        "abstraction"
    ];
    // array of numbers 0-12 ?
    // words = words.concat((new Array(13)).fill(0).map((v, i) => `${i}`));

    let speak = (speaker) => {
        let text = `${words[~~(Math.random() * words.length)]}${Math.random < 0.25? "?" : ""}`;
        let utt = new SpeechSynthesisUtterance(text);
        utt.pitch = Math.random() * 1.3 + 1;
        utt.rate = Math.random() < .125? 1 / (1+Math.random()*2) : 1;
        utt.lang = speaker.lang;

        speechSynthesis.speak(utt);
    };

    let tIDs = [];

    for(let speaker of speakers) {
        tIDs.push(window.setInterval(() => speak(speaker), speaker.interval));
    }
    
    await new Promise((resolve, reject) => musicSource.onended = () => resolve())

    for(let id of tIDs) {
        window.clearInterval(id);
    }
}

const DEBUG = false;

window.onload = () => {
    if(DEBUG) {
        init();
        perform(); // async
    } else {
        document.querySelector("button.main").addEventListener("click", ev => {
            init();
            perform(); // async
        })
    }
}



// old words 

/*

        "hello",
        "no",
        "what",
        "how",
        "there",
        "Es gibt im Moment in diese Mannschaft, oh, einige Spieler vergessen",
        "Zeitungen, aber ich habe gehört viele Situationen. Erstens: wir",
        "Mannschaft spielt offensiv und die Name offensiv wie Bayern.",
        "und dann Zickler. Wir müssen nicht vergessen Zickler. Zickler",
        "Wörter, ist möglich verstehen, was ich hab gesagt? Danke. Offensiv",
        "habe erklärt mit diese zwei Spieler: nach Dortmund brauchen vielleicht",
        "gesehen in Europa nach diese Mittwoch. Ich habe gesehen auch",
        "Trainer sei sehen was passieren in Platz. In diese Spiel es waren",
        "leer! Haben Sie gesehen Mittwoch, welche Mannschaft hat gespielt",
        "hat gespielt Trapattoni? Diese Spieler beklagen mehr als sie",
        "nicht diese Spieler? Weil wir haben gesehen viele Male solche",

*/