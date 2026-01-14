
'use client';

import { db, storage, auth } from "@/lib/firebase";
import { collection, doc, getDoc, DocumentData, setDoc, updateDoc, getDocs, arrayUnion, arrayRemove, addDoc, serverTimestamp, limit, query as firestoreQuery } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, signInWithCredential } from "firebase/auth";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';


// --- NOUVELLE FONCTION DE DECONNEXION ---
export async function signOutFromGoogle() {
  try {
    // La déconnexion doit aussi être gérée différemment si le plugin natif est utilisé
    if (Capacitor.isNativePlatform()) {
      await GoogleAuth.signOut();
    }
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la déconnexion :", error);
    // Tenter de déconnecter Firebase même si la déconnexion Google native échoue
    await firebaseSignOut(auth).catch(e => console.error("Erreur lors de la déconnexion Firebase de secours :", e));
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
    return { success: false, error: errorMessage };
  }
}

async function handleUser(user: any) {
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    const [firstName] = user.displayName?.split(' ') || [''];
    const photoURL = user.photoURL || null;
    
    const newProfileData = {
      uid: user.uid,
      email: user.email,
      firstName: firstName,
      name: user.displayName,
      profilePictures: photoURL ? [photoURL] : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      friends: [],
      isPremium: false,
      subscriptionEndDate: null,
      isVerified: false,
      profileComplete: false 
    };
    await setDoc(userRef, sanitizeData(newProfileData));

    return { 
      success: true, 
      isNewUser: true,
      userData: { 
        firstName: firstName, 
        photoURL: photoURL 
      } 
    };
  } else {
    const data = userDoc.data();
    return { 
        success: true, 
        isNewUser: false,
        profileComplete: data.profileComplete === true 
    };
  }
}

export async function signInWithGoogle() {
  try {
    let user;
    if (Capacitor.isNativePlatform()) {
      const googleUser = await GoogleAuth.signIn();
      if (!googleUser.authentication?.idToken) {
        throw new Error('Native Google sign-in failed: idToken is missing.');
      }
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      const userCredential = await signInWithCredential(auth, credential);
      user = userCredential.user;
    } else {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      user = result.user;
    }
    return await handleUser(user);
  } catch (error: any) {
    console.error("signInWithGoogle error:", error);
    let errorMessage = "Une erreur inconnue est survenue.";
    if (error.message) {
        if (error.message.includes('12501') || error.message.includes('canceled')) {
            errorMessage = 'Connexion annulée par l\'utilisateur.';
        } else {
            errorMessage = error.message;
        }
    } else if (error.code) {
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Connexion annulée par l\'utilisateur.';
        } else {
            errorMessage = error.code;
        }
    }
    return { success: false, error: errorMessage };
  }
}

export async function handleGoogleRedirect() {
    console.log("handleGoogleRedirect is deprecated with the current authentication approach.");
    return null;
}


function sanitizeData(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item));
  }
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = sanitizeData(obj[key]);
    }
  }
  return newObj;
}

export async function generateAgoraToken(channelName: string, uid: number | string) {
  console.warn("Generation de token simulée (Client Side). Assurez-vous d'être en mode Test sur Agora.");
  return { success: true, token: null };
}

export async function initiateCall(callerId: string, receiverId: string, isVideo: boolean) {
  if (!callerId || !receiverId) {
    return { success: false, error: "Caller and receiver IDs are required." };
  }
  try {
    const channelId = [callerId, receiverId].sort().join('_');
    const callDocRef = doc(db, 'calls', channelId);
    await setDoc(callDocRef, {
      channelId,
      callerId,
      receiverId,
      isVideo,
      status: 'ringing',
      createdAt: serverTimestamp(),
    });
    return { success: true, channelId };
  } catch (error) {
    console.error("Error initiating call:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}

async function uploadProfilePicture(userId: string, photoDataUri: string): Promise<string | null> {
    if (!userId || !photoDataUri || !photoDataUri.startsWith('data:')) {
        console.error("Invalid data for photo upload.");
        return null;
    }
    try {
        const photoId = uuidv4();
        const storageRef = ref(storage, `profilePictures/${userId}/${photoId}.jpg`);
        const uploadResult = await uploadString(storageRef, photoDataUri, 'data_url');
        const downloadURL = await getDownloadURL(uploadResult.ref);
        return downloadURL;
    } catch (e) {
        console.error("Error uploading profile picture:", e);
        return null;
    }
}

export async function createUserProfile(userId: string, profileData: any) {
    if (!userId) {
        return { success: false, error: "User is not authenticated." };
    }
    try {
        const { profilePictures: photoDataUris, ...restOfProfileData } = profileData;
        const userDoc = await getDoc(doc(db, "users", userId));
        const existingPhotos = userDoc.exists() ? userDoc.data().profilePictures || [] : [];
        let uploadedPhotoUrls: string[] = [...existingPhotos];
        if (photoDataUris && photoDataUris.length > 0) {
            const newPhotosToUpload = photoDataUris.filter((uri: string) => !uri.startsWith('http'));
            const uploadPromises = newPhotosToUpload.map((uri: string) => uploadProfilePicture(userId, uri));
            const results = await Promise.all(uploadPromises);
            const successfullyUploaded = results.filter((url): url is string => url !== null);
            uploadedPhotoUrls = [...existingPhotos, ...successfullyUploaded];
        }
        const finalProfileData = {
            ...restOfProfileData,
            profilePictures: uploadedPhotoUrls,
            updatedAt: new Date().toISOString(),
        };
        if (finalProfileData.dates?.from) {
          finalProfileData.dates.from = new Date(finalProfileData.dates.from);
        }
        if (finalProfileData.dates?.to) {
          finalProfileData.dates.to = new Date(finalProfileData.dates.to);
        }
        await setDoc(doc(db, "users", userId), sanitizeData(finalProfileData), { merge: true });
        return { success: true, id: userId };
    } catch (e: any) {
        console.error("Error in createUserProfile:", e);
        return { success: false, error: e.message || "An unknown error occurred." };
    }
}

export async function updateUserProfile(userId: string, profileData: any) {
    if (!userId) {
        return { success: false, error: "User is not authenticated." };
    }
    try {
        const { profilePictures, ...restOfProfileData } = profileData;
        const finalProfileData = {
            ...restOfProfileData,
            profilePictures: profilePictures, 
            updatedAt: new Date().toISOString(),
        };
        if (finalProfileData.dates?.from) {
            finalProfileData.dates.from = new Date(finalProfileData.dates.from);
        }
        if (finalProfileData.dates?.to) {
            finalProfileData.dates.to = new Date(finalProfileData.dates.to);
        }
        await updateDoc(doc(db, "users", userId), sanitizeData(finalProfileData));
        return { success: true, id: userId };
    } catch (e: any) {
        console.error("Error in updateUserProfile:", e);
        return { success: false, error: e.message || "An unknown error occurred." };
    }
}

export async function addProfilePicture(userId: string, photoDataUri: string) {
    if (!userId) {
        return { success: false, error: "User ID is required." };
    }
    if (!photoDataUri || !photoDataUri.startsWith('data:')) {
        return { success: false, error: "Invalid photo data provided." };
    }
    try {
        const photoUrl = await uploadProfilePicture(userId, photoDataUri);
        if (!photoUrl) {
          return { success: false, error: "Failed to upload profile picture." };
        }
        const profileRef = doc(db, "users", userId);
        await updateDoc(profileRef, {
            profilePictures: arrayUnion(photoUrl),
            updatedAt: new Date().toISOString(),
        });
        return { success: true, url: photoUrl };
    } catch (e) {
        console.error("Error adding profile picture:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error: `Failed to add profile picture: '${errorMessage}'` };
    }
}

export async function removeProfilePicture(userId: string, photoUrl: string) {
    if (!userId) {
        return { success: false, error: "User ID is required." };
    }
     if (!photoUrl) {
        return { success: false, error: "Photo URL is required." };
    }
    try {
        const profileRef = doc(db, "users", userId);
        await updateDoc(profileRef, {
            profilePictures: arrayRemove(photoUrl),
            updatedAt: new Date().toISOString(),
        });
        const photoRef = ref(storage, photoUrl);
        await deleteObject(photoRef);
        return { success: true };
    } catch (e) {
        console.error("Error removing profile picture:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        return { success: false, error: `Failed to remove picture: '${errorMessage}'` };
    }
}

export async function getUserProfile(id: string): Promise<DocumentData | null> {
  try {
    const docRef = doc(db, "users", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { id: docSnap.id, ...data };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting document:", error);
    throw new Error("Failed to retrieve user profile.");
  }
}

export async function getAllUsers(count?: number) {
  try {
    const usersCollection = collection(db, "users");
    const q = count ? firestoreQuery(usersCollection, limit(count)) : usersCollection;
    const userSnapshot = await getDocs(q);
    const userList = userSnapshot.docs.map(doc => {
      const data = doc.data();
      if (data.dates) {
        if (data.dates.from && typeof data.dates.from.toDate === 'function') {
          data.dates.from = data.dates.from.toDate().toISOString();
        }
        if (data.dates.to && typeof data.dates.to.toDate === 'function') {
          data.dates.to = data.dates.to.toDate().toISOString();
        }
      }
      if (data.subscriptionEndDate && typeof data.subscriptionEndDate.toDate === 'function') {
        data.subscriptionEndDate = data.subscriptionEndDate.toDate().toISOString();
      }
      return { id: doc.id, ...data };
    });
    return userList;
  } catch (error) {
    console.error("Error getting all users:", error);
    throw new Error("Failed to retrieve user list.");
  }
}

export async function submitAbuseReport(
  reporterId: string,
  reportedId: string,
  reason: string,
  details: string
) {
  if (!reporterId || !reportedId || !reason) {
    return { success: false, error: 'Informations manquantes pour le signalement.' };
  }
  try {
    const reportsCollection = collection(db, 'abuseReports');
    await addDoc(reportsCollection, {
      reporterId,
      reportedId,
      reason,
      details,
      status: 'pending', 
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la soumission du signalement:", error);
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
    return { success: false, error: errorMessage };
  }
}

export async function submitVerificationRequest(userId: string, selfieDataUrl: string) {
    if (!userId || !selfieDataUrl) {
        return { success: false, error: 'User ID and selfie are required.' };
    }
    try {
        const storageRef = ref(storage, `verification_selfies/${userId}.jpg`);
        const uploadResult = await uploadString(storageRef, selfieDataUrl, 'data_url');
        const selfieUrl = await getDownloadURL(uploadResult.ref);
        const verificationRef = doc(db, 'verificationRequests', userId);
        await setDoc(verificationRef, {
            userId: userId,
            selfieUrl: selfieUrl,
            status: 'pending', 
            requestedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error submitting verification request:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}


export async function addFriend(currentUserId: string, friendId: string) {
  if (!currentUserId || !friendId) {
    return { success: false, error: 'User IDs are required.' };
  }
  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const friendRef = doc(db, 'users', friendId);
    await updateDoc(currentUserRef, {
      friends: arrayUnion(friendId),
    });
    await updateDoc(friendRef, {
      friends: arrayUnion(currentUserId),
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding friend:', error);
    return { success: false, error: 'Failed to add friend.' };
  }
}

export async function removeFriend(currentUserId: string, friendId: string) {
  if (!currentUserId || !friendId) {
    return { success: false, error: 'User IDs are required.' };
  }
  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const friendRef = doc(db, 'users', friendId);
    await updateDoc(currentUserRef, {
      friends: arrayRemove(friendId),
    });
    await updateDoc(friendRef, {
      friends: arrayRemove(currentUserId),
    });
    return { success: true };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { success: false, error: 'Failed to remove friend.' };
  }
}

export async function getFriends(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return [];
    }
    const userData = userDoc.data();
    const friendIds = userData.friends || [];
    if (friendIds.length === 0) {
      return [];
    }
    const friendPromises = friendIds.map((id: string) => getDoc(doc(db, "users", id)));
    const friendDocs = await Promise.all(friendPromises);
    const friends = friendDocs
      .filter(doc => doc.exists())
      .map(doc => ({ id: doc.id, ...doc.data() }));
    return friends;
  } catch (error) {
    console.error("Error getting friends:", error);
    throw new Error("Failed to retrieve friends list.");
  }
}
