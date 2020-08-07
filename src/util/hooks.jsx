import { useState, useEffect, useCallback } from 'preact/hooks'
import axios from 'redaxios';
import * as firebase from "firebase/app";
import "firebase/database";
import "firebase/auth";


const firebaseConfig = {
	apiKey: process.env.FIREBASE_API_KEY,
	authDomain: process.env.FIREBASE_AUTH_DOMAIN,
	projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
}

console.log(firebaseConfig);

if (firebase.apps.length == 0) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth()
const db = firebase.database()


export const useUser = () => {
	const [user, setUser] = useState(null)
	useEffect(async () => {
		if (auth.currentUser === null) {
			const response = await axios.get('/.netlify/functions/auth')
			const { token } = response.data;
			await auth.signInWithCustomToken(token);
		}
		setUser(auth.currentUser)
	}, [])
	return user;
}

export const useData = (user) => {
	const [snapshot, setSnapshot] = useState(null);
	const [ref, setRef] = useState(null);

	useEffect(() => {
		if (user !== null) {
			const ref = db.ref('rooms/' + user.uid)
			setRef(ref)
			ref.on('value', (snapshot) => {
				setSnapshot(snapshot);
				console.log('Received snapshot', snapshot)
			})
			return () => ref.off('value')
		}
	}, [user])

	const upload = useCallback(async (url) => {
		if (ref !== null) {
			console.log('setting url ', url)
			try {
				await ref.set({
					url,
					timestamp: Date.now()
				})
				console.log('set succeeded')
			}
			catch (e) {
				console.log('failed to upload: ', e)
			}
		}
	}, [ref]);

	const clear = useCallback((url) => {
		if (ref !== null) {
			ref.remove();
		}
	}, [ref])

	return [snapshot, upload, clear]
}

export const useDoc = (user) => {
	const [snapshot, setSnapshot] = useState(null)
	const setDocUrl = useCallback(async (url) => {
		console.log('running uploadUrl: ', url)
		if (user !== null) {
			const minutes = 10
			const payload = {
				url,
				expires: Date.now() + 1000 * 60 * minutes
			}
			console.log('Sending payload: ', payload,' to uid ', user.uid)
			await db.collection("rooms").doc(user.uid).set(payload)
		}
	}, [user])
	const deleteDoc = useCallback(async() => {
		if (user !== null) {
			await db.collection("rooms").doc(user.uid).delete()
			console.log("Deleted records for uid ", user.uid)
		}
	}, [user])
	useEffect(() => {
		if (user !== null) {
			db.collection("rooms").doc(user.uid).onSnapshot(snapshot => {
				const data = snapshot.data()
				console.log("Received new snapshot data: ", data)
				setSnapshot(snapshot)
			})
		}
	}, [user])
	return [snapshot, setDocUrl, deleteDoc]
}

export const usePreview = () => {
	const [target, setValidTarget] = useState(null)
	const [data, setData] = useState(null)
	
	const setTarget = (url) => {
		const prefix = url.match(/https?:\/\//) ? '' : 'http://'
		console.log("Setting preview target")
		setValidTarget(prefix + url);
	}

	useEffect(async () => {
		// TODO: This effect is not run if prev target URL matches new one, thus the preview is never rendered
		// Possible solution: cancel form if url matches
		const fallbackThumbnail = 'https://picsum.photos/id/1025/200';
		if (target !== null) {
			try {
				const response = await axios.post('/.netlify/functions/preview', {url: target})
				const preview = response.data;

				let thumbnail;
				if (preview.images && preview.images.length > 0) thumbnail = preview.images[0];
				else if (preview.favicons && preview.favicons.length > 1) thumbnail = preview.favicons[1];
				else thumbnail = fallbackThumbnail;
				const title = preview.siteName || preview.title || '(No title)'
				const description = preview.description || ''
				const url = preview.url || target;
				if (!preview.url) console.warning("Preview URL was missing");
				
				setData({title, description, url, thumbnail});
			}
			catch (e) {
				setData({url: target, title: '(No preview)', description:'', thumbnail: fallbackThumbnail})
			}
		}
	}, [target])
	return [data, setTarget]
}

export const useCountdown = (onComplete) => {
	const [timeLeft, setTimeLeft] = useState(0)
	const [timer, setTimer] = useState(null)
	const [endTime, setEndTime] = useState(null)

	const getTimeLeft = useCallback(() => {
		return endTime && Math.max(endTime - Date.now(), 0)
	}, [endTime])

	useEffect(() => {
		if (timer && timeLeft === 0) {
			clearTimer()
			onComplete()
		}
	}, [timeLeft, timer])

	const clearTimer = useCallback(() => {
		setTimeLeft(0)
		clearInterval(timer)
		setTimer(null)
	}, [timer])
	
	useEffect(() => {
		if (endTime) {
			clearTimer()
			setTimeLeft(getTimeLeft())
			const timer = setInterval(() => {
				setTimeLeft(getTimeLeft())
			}, 1000)
			setTimer(timer)
		}
	}, [endTime])
	
	return [timeLeft, setEndTime, clearTimer]
}
