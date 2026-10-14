// Shared Firestore helpers for free course enrollment.
// Security is enforced by Firestore rules, not by this client-side module.
export async function readCourseEnrollment({ db, firestore, uid, courseId }) {
  const ref = firestore.doc(db, "enrollments", `${uid}__${courseId}`);
  const snapshot = await firestore.getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function readCourseSettings({ db, firestore, courseId }) {
  const ref = firestore.doc(db, "courseSettings", courseId);
  const snapshot = await firestore.getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function createFreeCourseEnrollment({ db, firestore, uid, courseId, profile }) {
  const ref = firestore.doc(db, "enrollments", `${uid}__${courseId}`);
  const profileRef = firestore.doc(db, "profiles", uid);
  return firestore.runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const profileSnapshot = await transaction.get(profileRef);
    if (snapshot.exists()) {
      if (snapshot.data().status === "active") return false;
      throw new Error("An enrollment record already exists and needs administrator review.");
    }
    const now = firestore.serverTimestamp();
    transaction.set(ref, {
      uid,
      courseId,
      status: "active",
      source: "self-service-free",
      enrolledAt: now
    });
    if (profileSnapshot.exists()) {
      transaction.set(profileRef, {
        displayName: profile?.displayName || null,
        updatedAt: now
      }, { merge: true });
    } else {
      transaction.set(profileRef, {
        email: String(profile?.email || "").toLowerCase(),
        displayName: profile?.displayName || null,
        createdAt: now,
        updatedAt: now
      });
    }
    return true;
  });
}
