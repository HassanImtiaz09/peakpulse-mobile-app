/**
 * Exercise Image Asset Registry
 *
 * Maps exercise keys to AI-generated exercise demonstration images hosted on CDN.
 * These replace the previous MuscleWiki GIF assets with high-quality AI-generated images.
 */

// CDN-hosted AI-generated exercise demonstration images
export const EXERCISE_GIFS: Record<string, string> = {
  // ── Chest ───────────────────────────────────────────────────────
  "male-Barbell-barbell-close-grip-bench-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/xjPhhBcnZFjbxrPt.png",
  "male-Barbell-barbell-incline-bench-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/mWunUECIbgbWUPJi.png",
  "male-Dumbbells-dumbbell-weighted-dip-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/fIMLVqcdtkUTUExN.png",
  "male-barbell-bench-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/IciLPTXbNLzyYQDz.png",
  "male-bodyweight-bench-dips-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/lnUWBadaspJcsVCu.png",
  "male-bodyweight-push-up-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/qMqbVeSkIScGWeln.png",
  "male-cable-pec-fly-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/LPUMeiBqbsBSTSNg.png",
  "male-dumbbell-chest-fly-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/QMAxVAlcCmJIOSGy.png",
  "male-dumbbell-decline-bench-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/ohSnqDeISDQlugUc.png",
  "male-dumbbell-incline-bench-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/qbVTMamUSBhHRXFP.png",

  // ── Back ────────────────────────────────────────────────────────
  "male-Barbell-barbell-bent-over-row-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/vWWXQMPquhdIpUmf.png",
  "male-Barbell-barbell-deadlift-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/pzsBFJNQTzekfGzE.png",
  "male-Barbell-barbell-romanian-deadlift-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/SpUSTkJKspUyGQgK.png",
  "male-Barbell-barbell-sumo-deadlift-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/LaFjGmQdEHhBWVUw.png",
  "male-Barbell-landmine-t-bar-rows-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/ChXzuIPmXoGBQBYI.png",
  "male-Dumbbells-dumbbell-pendlay-row-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/QnzClWYDNyizXGFK.png",
  "male-barbell-stiff-leg-deadlift-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/pGplGoUSTmBDPSvA.png",
  "male-bodyweight-chin-ups-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/gRQVtBkEopPyFGnp.png",
  "male-bodyweight-pull-ups-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/lKYMSTwMgeSTUjoV.png",
  "male-dumbbell-row-bilateral-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/hAejujtVpVuDXMmw.png",
  "male-machine-pulldown-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/bJTDFwdQtDzODwdX.png",
  "male-machine-seated-cable-row-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/xiEOIoDFrDLyoQgO.png",

  // ── Shoulders ───────────────────────────────────────────────────
  "male-Barbell-barbell-overhead-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/kgsOjquFixCJuxWg.png",
  "male-Cable-cable-rope-face-pulls-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/SZgCmqcaPFEavQZw.png",
  "male-Dumbbells-dumbbell-arnold-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/tYQcxaHElvkIxKJv.png",
  "male-Dumbbells-dumbbell-overhead-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/gnHJKzEXdtdQHBnQ.png",
  "male-Dumbbells-dumbbell-shrug-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/zEnswTmjMDrPipXQ.png",
  "male-Kettlebells-kettlebell-upright-row-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/wBYFAeNCgXmcDeST.png",
  "male-dumbbell-front-raise-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/cYmcAjzkbzwDgabK.png",
  "male-dumbbell-lateral-raise-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/UcsSvMtgSNjiwjCJ.png",
  "male-dumbbell-rear-delt-fly-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/hnlfWJTRNLYvErWK.png",

  // ── Biceps ──────────────────────────────────────────────────────
  "male-Barbell-barbell-curl-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/ijCSvHSplAYhQSyN.png",
  "male-Dumbbells-dumbbell-curl-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/EXaJqPCiPBEgnngt.png",
  "male-Dumbbells-dumbbell-leg-curl-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/upJmgGwREijqcGdc.png",
  "male-Dumbbells-dumbbell-preacher-curl-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/mMTqLQAXZpNqeHAb.png",
  "male-dumbbell-concentration-curl-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/uzCtsPmiYQdGFUSu.png",
  "male-dumbbell-hammer-curl-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/pGnywSTjKgENPPUL.png",

  // ── Triceps ─────────────────────────────────────────────────────
  "male-Bands-band-overhead-tricep-extension-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/kvBDyjwsleQOlNuq.png",
  "male-Bodyweight-bodyweight-tricep-extension-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/WvehWDHVixqKIIgO.png",
  "male-Kettlebells-kettlebell-skull-crusher-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/ltcYHJBDDlxlfKim.png",
  "male-Machine-machine-tricep-pushdown-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/eGHvonrewMMIpLbd.png",

  // ── Legs ────────────────────────────────────────────────────────
  "male-Barbell-barbell-front-squat-olympic-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/VAvkSPBCPdvNcmVV.png",
  "male-Barbell-barbell-hip-thrust-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/MBOelWRTwTGIqbGB.png",
  "male-Barbell-barbell-reverse-lunge-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/jQVVWcMuHdjRduwW.png",
  "male-Barbell-barbell-squat-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/gAGjbuTDdpHTlTqd.png",
  "male-Bodyweight-walking-lunge-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/gcyQAjHHyKhTbdOX.png",
  "male-Kettlebells-kettlebell-seated-calf-raise-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/zLgyXhOYUCbUWpiD.png",
  "male-Kettlebells-kettlebell-step-up-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/FYiIyOnRdyGZIVqm.png",
  "male-Machine-machine-hack-squat-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/NQQDzpCGtfGjYIWy.png",
  "male-bodyweight-bulgarian-split-squat-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/fXwsKVOiFqRxIIbZ.png",
  "male-bodyweight-forward-lunge-front_zb4K50d": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/iyudKBpNQLyyqwIZ.png",
  "male-bodyweight-glute-bridge-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/ZdiKLRBTtIUARoAQ.png",
  "male-dumbbell-goblet-squat-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/mxjbgFOwHKYlpqAQ.png",
  "male-machine-leg-extension-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/tdWAUnQjYbhLFVEi.png",
  "male-machine-leg-press-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/ShNxUbIFKYLJcJFV.png",
  "male-machine-standing-calf-raises-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/MZkQWXykCyEFhWaV.png",

  // ── Core ────────────────────────────────────────────────────────
  "male-Bodyweight-bicycle-crunch-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/cxIkYnQhVxIwUzna.png",
  "male-Bodyweight-dead-bug-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/WaccKLwEKfasHtyr.png",
  "male-Bodyweight-elbow-side-plank-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/rfGrKJYqhmlrtCen.png",
  "male-Bodyweight-floor-incline-leg-raise-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/wiGwdaIkmpTPZHyI.png",
  "male-Bodyweight-mountain-climber-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/tKuvUwKISJMYDywW.png",
  "male-Bodyweight-situp-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/OFocRZtFWQJAAtIH.png",
  "male-Kettlebells-kettlebell-russian-twist-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/CsfSCYklwZXLjFyI.png",
  "male-TRX-trx-ab-rollout-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/cvaNCYTMeKGPHPrf.png",
  "male-bodyweight-crunch-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/MqjPqOEZDofryqpq.png",
  "male-bodyweight-forearm-plank-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/cNDdEfdcVGgTYYVr.png",
  "male-bodyweight-hanging-knee-raises-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/DWNFUeWQVhrEEvnb.png",
  "male-cable-woodchopper-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/gvxOOTCAIrHTqIDc.png",

  // ── Cardio ──────────────────────────────────────────────────────
  "battle-rope": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/UHXqkwiRYhgnwwvd.png",
  "high-knees": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/SqYhECBbUnLuHGFT.png",
  "male-Bodyweight-burpee-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/phrkAPDFHGSavbvy.png",
  "male-Cardio-cardio-jumping-jacks-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/heThgiLpyVYqDdGc.png",
  "male-Cardio-jump-rope-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PYrZkPXpwWhGJDnp.png",
  "male-Cardio-treadmill-sprint-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/tytDKMEsKOjseJaI.png",
  "male-Kettlebells-kettlebell-swing-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/aMbKCLVJjbDIbAtP.png",
  "male-Plyometrics-box-jump-front": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/VgZBZRVjBZAPnBSS.png",

};

// CDN GIFs map (for oversized assets that were already on CDN)
export const CDN_GIFS: Record<string, string> = {};

