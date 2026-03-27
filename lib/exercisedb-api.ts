/**
 * ExerciseDB Animated GIF Service
 *
 * Provides real animated exercise demonstration GIFs sourced from ExerciseDB
 * (https://exercisedb-api.vercel.app). All GIFs are pre-downloaded, verified
 * as multi-frame animated, and hosted on our CDN for reliable delivery.
 *
 * Each GIF shows a clear anatomical illustration performing the exercise
 * with highlighted target muscles — gender-neutral (anatomical style).
 *
 * Coverage: 75 unique animated GIFs covering 104+ exercise name variants.
 */

const CDN = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618";

/**
 * CDN-hosted animated GIF mapping.
 * Key = ExerciseDB exercise ID, Value = CDN filename.
 * Every GIF is verified animated (12+ frames, 180×180).
 */
const CDN_GIFS: Record<string, string> = {
  "0CXGHya": `${CDN}/aZmyFWofRbTdtSmP.gif`,  // cable cross-over
  "17lJ1kr": `${CDN}/UgfEuqvcZOgLAlaX.gif`,  // lever lying leg curl
  "3TZduzM": `${CDN}/BqHEGYgRcxAFJQfJ.gif`,  // barbell incline bench press
  "3eGE2JC": `${CDN}/MxCLkJgqLmGFnCaQ.gif`,  // dumbbell front raise
  "5VXmnV5": `${CDN}/zQBSLWlLTectSLEV.gif`,  // bodyweight incline side plank
  "5eLRITT": `${CDN}/FzxvkjWDoAMRRDxs.gif`,  // dumbbell stiff leg deadlift
  "6ZCiYWQ": `${CDN}/RvCrZHqHVyoNKLPt.gif`,  // sit-up with arms on chest
  "7zdxRTl": `${CDN}/UjdKTtEjqyXqgknJ.gif`,  // smith leg press
  "8DiFDVA": `${CDN}/HUGhHohYIGkVgCWh.gif`,  // dumbbell rear fly
  "9E25EOx": `${CDN}/VXVUbBuIExmiiytw.gif`,  // split squats
  "9WTm7dq": `${CDN}/qhfjBeMdrJwBtjFg.gif`,  // chest dip
  "BJ0Hz5L": `${CDN}/HkHzBZWDkGwDMTkz.gif`,  // dumbbell bent over row
  "BgljGjd": `${CDN}/XyJwFiQjypVagHKQ.gif`,  // lever reverse t-bar row
  "C0MA9bC": `${CDN}/ZbYXACDVmhoAQouD.gif`,  // dumbbell one arm bent-over row
  "DOoWcnA": `${CDN}/ykFpJrzRENpTjcGi.gif`,  // lever chest press
  "EIeI8Vf": `${CDN}/CRLGQlwBjgkrxbBs.gif`,  // barbell bench press
  "GrO65fd": `${CDN}/qKLirvCMHPNXcviw.gif`,  // barbell decline bench press
  "I3tsCnC": `${CDN}/zVCpSTRScHDzZNPm.gif`,  // hanging leg raise
  "I4hDWkc": `${CDN}/DHxEbkLEzIJYEMwK.gif`,  // push-up
  "KgI0tqW": `${CDN}/xASEvHUrAWuyLszd.gif`,  // barbell sumo deadlift
  "Kxquu2E": `${CDN}/qNmZMUHIdmFuIodE.gif`,  // barbell step-up
  "LEprlgG": `${CDN}/SiwnrjyjIMZflOds.gif`,  // cable lat pulldown full ROM
  "LIlE5Tn": `${CDN}/wQJCbvAAgeRkfZiM.gif`,  // jump squat
  "NbVPDMW": `${CDN}/fezBDMvPviloKaes.gif`,  // dumbbell biceps curl
  "NN8nSNT": `${CDN}/sXeyGgXAUFbzfDdS.gif`,  // cable rope overhead tricep extension
  "Pjbc0Kt": `${CDN}/NyddVoXdzoSiqdac.gif`,  // resistance band hip thrusts
  "PzQanLE": `${CDN}/KzEmsuZVBkBdMujJ.gif`,  // cable shoulder press
  "QTXKWPh": `${CDN}/RkBUEvtRtqoJRqIb.gif`,  // cable pulldown bicep curl
  "Qa55kX1": `${CDN}/RijnKgJOuTLdkDKS.gif`,  // sled hack squat
  "SGY8Zui": `${CDN}/COCUjATxOugYJKcm.gif`,  // barbell clean and press
  "SSsBDwB": `${CDN}/cjoEblSzJOPKKbhL.gif`,  // dumbbell rear lunge
  "SpYC0Kp": `${CDN}/viHbTgWvIETBgUUm.gif`,  // dumbbell bench press
  "SpsOSXk": `${CDN}/LdHjQkDNztMUkWSi.gif`,  // cable rear pulldown
  "T2mxWqc": `${CDN}/QLxDrahmFhSrCarb.gif`,  // chin-up
  "UHJlbu3": `${CDN}/BqLHXMdzEKucqlwx.gif`,  // kettlebell swing
  "VBAWRPG": `${CDN}/mDPjdrtIjeWaTZye.gif`,  // weighted front plank
  "W6PxUkg": `${CDN}/ZnQCrERGPiZrSzAm.gif`,  // dumbbell kickback
  "WcHl7ru": `${CDN}/hOPeHauGXZkwrsfe.gif`,  // smith close-grip bench press
  "WhuFnR7": `${CDN}/yRDXTlwpJgCAcsGl.gif`,  // lying leg raise flat bench
  "XVDdcoj": `${CDN}/jKddHXogOiCXOxwp.gif`,  // russian twist
  "Y7YcmIJ": `${CDN}/RpKcmPyxLYQNxEEe.gif`,  // barbell bench front squat
  "aXtJhlg": `${CDN}/eWfzHWzQHtXDIHoO.gif`,  // dumbbell step-up
  "b6hQYMb": `${CDN}/xYIyTOOMULLmxElG.gif`,  // lever preacher curl
  "cALKspW": `${CDN}/VglFKavYTPLkZvFU.gif`,  // cable upright row
  "dG7tG5y": `${CDN}/AiPqHbAiwCRqMBbe.gif`,  // barbell shrug
  "e1e76I2": `${CDN}/wTejyiDHNHgVXvwy.gif`,  // jump rope
  "eZyBC3j": `${CDN}/wdsqisloOnYYAJrx.gif`,  // barbell bent over row
  "ealLwvX": `${CDN}/wNhiYncWSOAFlfbp.gif`,  // high knee against wall
  "fUBheHs": `${CDN}/nscUqmEleSThcXmD.gif`,  // cable seated row
  "fhZQPlV": `${CDN}/MfbVmxYSssAuOvFL.gif`,  // cable twist
  "h8LFzo9": `${CDN}/GwglDUfdBNNgMEGM.gif`,  // barbell lying triceps extension skull crusher
  "hrVQWvE": `${CDN}/wScOQOdQmBoVVUKu.gif`,  // barbell straight leg deadlift
  "hxyTtWj": `${CDN}/vrvHkMybRHzOoXRS.gif`,  // dumbbell seated lateral raise
  "iPm26QU": `${CDN}/UfEZHGIumYrIQuad.gif`,  // box jump down with stabilization
  "ipvgBnC": `${CDN}/ZeOmCXvtmBhcqusm.gif`,  // barbell seated calf raise
  "jK2hZ6n": `${CDN}/RmCWzvDFvqAcvZBf.gif`,  // dumbbell one arm seated hammer curl
  "km2Ljzj": `${CDN}/NShAoPxoyFPXlbEZ.gif`,  // wheel run
  "lBDjFxJ": `${CDN}/bLCOjooWhmSSaJFc.gif`,  // pull-up
  "mpKZGWz": `${CDN}/dtXzwFNZWmyNTqZt.gif`,  // dumbbell lying triceps extension
  "my33uHU": `${CDN}/ogpsXirVETUhgwJE.gif`,  // lever leg extension
  "ns0SIbU": `${CDN}/JjQAQorAIjrOxVtT.gif`,  // dumbbell incline bench press
  "oLrKqDH": `${CDN}/SNOAvnksfdQQWoYf.gif`,  // run
  "qPEzJjA": `${CDN}/CjAfYbqALvlcfjSl.gif`,  // farmers walk
  "qRZ5S1N": `${CDN}/MsquyEXNlJqtSXWH.gif`,  // cable one arm tricep pushdown
  "r0z6xzQ": `${CDN}/UUtWowKolMXWVxhq.gif`,  // barbell pendlay row
  "s8nrDXF": `${CDN}/CgITzoOftDwYzxdP.gif`,  // weighted crunch
  "tZkGYZ9": `${CDN}/EnVwndMvZyzAFNgv.gif`,  // band bicycle crunch
  "u0cNiij": `${CDN}/sxRHYhWkwmhNtRBE.gif`,  // low glute bridge on floor
  "u4bAmKp": `${CDN}/TfvOkveZxSnNJmKs.gif`,  // mountain climber
  "vpQaQkH": `${CDN}/zIJYRXNIKomVvTBy.gif`,  // ski ergometer
  "wQ2c4XD": `${CDN}/ZlvlzIzXWKqgzMof.gif`,  // barbell romanian deadlift
  "xLYSdtg": `${CDN}/KRNaQgKdcsHHZrwe.gif`,  // cable middle fly
  "yl2IYyy": `${CDN}/ZbeyASYhupapteSf.gif`,  // cable standing calf raise
  "yn8yg1r": `${CDN}/fkGSyjkAgphWAEGI.gif`,  // dumbbell goblet squat
  "yz9nUhF": `${CDN}/uhukQEmEnmErstRP.gif`,  // dumbbell fly
  "znQUdHY": `${CDN}/FiXKuPzpxHYcvNwF.gif`,  // dumbbell seated shoulder press
};

/**
 * Hardcoded mapping: normalised exercise name → ExerciseDB exercise ID.
 * All IDs have verified animated GIFs on our CDN (76 unique GIFs, 104+ name variants).
 */
const EXERCISE_ID_MAP: Record<string, string> = {
  // ── Chest ──────────────────────────────────────────────────────────────────
  "bench press":              "EIeI8Vf",   // barbell bench press
  "barbell bench press":      "EIeI8Vf",
  "dumbbell bench press":     "SpYC0Kp",   // dumbbell bench press
  "incline bench press":      "3TZduzM",   // barbell incline bench press
  "incline dumbbell press":   "ns0SIbU",   // dumbbell incline bench press
  "decline bench press":      "GrO65fd",   // barbell decline bench press
  "close grip bench press":   "WcHl7ru",   // smith close-grip bench press
  "push up":                  "I4hDWkc",   // push-up
  "push-up":                  "I4hDWkc",
  "pushup":                   "I4hDWkc",
  "dumbbell fly":             "yz9nUhF",   // dumbbell fly
  "cable crossover":          "0CXGHya",   // cable cross-over variation
  "cable fly":                "xLYSdtg",   // cable middle fly
  "chest press machine":      "DOoWcnA",   // lever chest press
  "pec deck":                 "0CXGHya",   // cable cross-over (closest match)
  "dip":                      "9WTm7dq",   // chest dip
  "chest dip":                "9WTm7dq",

  // ── Back ───────────────────────────────────────────────────────────────────
  "deadlift":                 "hrVQWvE",   // barbell straight leg deadlift
  "barbell row":              "eZyBC3j",   // barbell bent over row
  "barbell bent over row":    "eZyBC3j",
  "dumbbell bent over row":   "BJ0Hz5L",   // dumbbell bent over row
  "pull up":                  "lBDjFxJ",   // pull-up
  "pull-up":                  "lBDjFxJ",
  "chin up":                  "T2mxWqc",   // chin-up
  "chin-up":                  "T2mxWqc",
  "lat pulldown":             "LEprlgG",   // cable lat pulldown full ROM
  "seated cable row":         "fUBheHs",   // cable seated row
  "t-bar row":                "BgljGjd",   // lever reverse t-bar row
  "bent over row":            "eZyBC3j",   // barbell bent over row
  "dumbbell row":             "C0MA9bC",   // dumbbell one arm bent-over row
  "pendlay row":              "r0z6xzQ",   // barbell pendlay row
  "tbar row":                 "BgljGjd",   // lever reverse t-bar row
  "single arm dumbbell row":  "BJ0Hz5L",   // dumbbell bent over row (closest)

  // ── Shoulders ──────────────────────────────────────────────────────────────
  "overhead press":           "PzQanLE",   // cable shoulder press
  "military press":           "PzQanLE",
  "shoulder press":           "PzQanLE",
  "arnold press":             "PzQanLE",   // closest match
  "lateral raise":            "hxyTtWj",   // dumbbell seated lateral raise
  "cable lateral raise":      "hxyTtWj",
  "dumbbell shoulder press":  "znQUdHY",   // dumbbell seated shoulder press
  "front raise":              "3eGE2JC",   // dumbbell front raise
  "face pull":                "SpsOSXk",   // cable rear pulldown (closest)
  "rear delt fly":            "8DiFDVA",   // dumbbell rear fly
  "upright row":              "cALKspW",   // cable upright row
  "shrug":                    "dG7tG5y",   // barbell shrug

  // ── Arms ───────────────────────────────────────────────────────────────────
  "barbell curl":             "NbVPDMW",   // dumbbell biceps curl (closest)
  "bicep curl":               "NbVPDMW",
  "dumbbell curl":            "NbVPDMW",
  "hammer curl":              "jK2hZ6n",   // dumbbell one arm seated hammer curl
  "preacher curl":            "b6hQYMb",   // lever preacher curl
  "concentration curl":       "NbVPDMW",   // dumbbell biceps curl
  "cable curl":               "QTXKWPh",   // cable pulldown bicep curl
  "tricep pushdown":          "qRZ5S1N",   // cable one arm tricep pushdown
  "skull crusher":            "h8LFzo9",   // barbell lying triceps extension skull crusher
  "overhead tricep extension":"NN8nSNT",   // cable rope overhead tricep extension
  "tricep extension":         "mpKZGWz",   // dumbbell lying triceps extension
  "tricep dip":               "9WTm7dq",   // chest dip (same movement)
  "dumbbell kickback":        "W6PxUkg",   // dumbbell kickback

  // ── Legs ───────────────────────────────────────────────────────────────────
  "squat":                    "LIlE5Tn",   // jump squat (dynamic, good demo)
  "barbell squat":            "LIlE5Tn",
  "front squat":              "Y7YcmIJ",   // barbell bench front squat
  "goblet squat":             "yn8yg1r",   // dumbbell goblet squat
  "hack squat":               "Qa55kX1",   // sled hack squat
  "leg press":                "7zdxRTl",   // smith leg press
  "romanian deadlift":        "wQ2c4XD",   // barbell romanian deadlift
  "leg curl":                 "17lJ1kr",   // lever lying leg curl
  "leg extension":            "my33uHU",   // lever leg extension
  "calf raise":               "yl2IYyy",   // cable standing calf raise
  "seated calf raise":        "ipvgBnC",   // barbell seated calf raise
  "hip thrust":               "Pjbc0Kt",   // resistance band hip thrusts
  "lunge":                    "Kxquu2E",   // barbell step-up (similar)
  "bulgarian split squat":    "9E25EOx",   // split squats
  "reverse lunge":            "SSsBDwB",   // dumbbell rear lunge
  "step up":                  "aXtJhlg",   // dumbbell step-up
  "glute bridge":             "u0cNiij",   // low glute bridge on floor
  "sumo deadlift":            "KgI0tqW",   // barbell sumo deadlift
  "stiff leg deadlift":       "5eLRITT",   // dumbbell stiff leg deadlift

  // ── Core ───────────────────────────────────────────────────────────────────
  "plank":                    "VBAWRPG",   // weighted front plank
  "russian twist":            "XVDdcoj",   // russian twist
  "hanging leg raise":        "I3tsCnC",   // hanging leg raise
  "cable crunch":             "VBAWRPG",   // weighted front plank (closest)
  "mountain climber":         "u4bAmKp",   // mountain climber
  "bicycle crunch":           "tZkGYZ9",   // band bicycle crunch
  "ab wheel rollout":         "km2Ljzj",   // wheel run (closest)
  "crunch":                   "s8nrDXF",   // weighted crunch
  "sit up":                   "6ZCiYWQ",   // sit-up with arms on chest
  "leg raise":                "WhuFnR7",   // lying leg raise flat bench
  "side plank":               "5VXmnV5",   // bodyweight incline side plank
  "cable woodchop":           "fhZQPlV",   // cable twist (up-down)
  "dead bug":                 "VBAWRPG",   // weighted front plank (closest)

  // ── Full Body / Cardio ─────────────────────────────────────────────────────
  "burpee":                   "u4bAmKp",   // mountain climber (closest dynamic)
  "power clean":              "SGY8Zui",   // barbell clean and press
  "clean and jerk":           "SGY8Zui",
  "snatch":                   "SGY8Zui",   // barbell clean and press (closest)
  "box jump":                 "iPm26QU",   // box jump down with stabilization
  "kettlebell swing":         "UHJlbu3",   // kettlebell swing
  "farmer walk":              "qPEzJjA",   // farmers walk
  "battle rope":              "e1e76I2",   // jump rope (closest)
  "rowing machine":           "vpQaQkH",   // ski ergometer (closest)
  "jump rope":                "e1e76I2",   // jump rope
  "jumping jack":             "e1e76I2",   // jump rope (closest)
  "high knees":               "ealLwvX",   // high knee against wall
  "sprint":                   "oLrKqDH",   // run
  "run":                      "oLrKqDH",   // run
};

/**
 * Get the CDN-hosted animated GIF URL for an exercise.
 * Returns null if the exercise is not in our mapping.
 */
export function getExerciseDbGifUrl(exerciseName: string): string | null {
  const normalised = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  const id = EXERCISE_ID_MAP[normalised];
  if (!id) return null;
  return CDN_GIFS[id] ?? null;
}

/**
 * Check if an exercise has a CDN-hosted animated GIF available.
 */
export function hasExerciseDbGif(exerciseName: string): boolean {
  const normalised = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  const id = EXERCISE_ID_MAP[normalised];
  return !!id && !!CDN_GIFS[id];
}

/**
 * Get the ExerciseDB exercise ID for an exercise.
 */
export function getExerciseDbId(exerciseName: string): string | null {
  const normalised = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  return EXERCISE_ID_MAP[normalised] ?? null;
}

/**
 * Get all mapped exercise names (normalised).
 */
export function getAllMappedExercises(): string[] {
  return Object.keys(EXERCISE_ID_MAP);
}
