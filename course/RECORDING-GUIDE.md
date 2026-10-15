# Recording Guide — Read Once, Then Record Every Chapter the Same Way

This guide is for you, the presenter. It is not a video script. Follow it once to set up, then open one chapter file per recording session.

## 1. Your setup (15 minutes, one time)

1. **Microphone first.** Any USB mic at a consistent distance beats an expensive camera. Record a 10-second test, listen on headphones, and keep that exact position for the whole course.
2. **Screen.** Use a clean demo repository, not your real work repo. Set the editor font to 16 pt or larger, dark theme, and hide notifications. Viewers read code on phones.
3. **Teleprompter.** Open the chapter `.md` file in any Markdown preview, scroll slowly, and read only the paragraphs under **Narration script**. The lines that start with `[` are cues for you. Skip them out loud.
4. **Framing.** Webcam small in a corner for talking sections. Go full-screen for every `[DEMO]`. Chapter scripts tell you exactly when to switch.
5. **One take per section.** Record section by section, not the whole chapter. If you stumble, pause for two seconds of silence and re-read the sentence. Silence is easy to cut. Overlapping audio is not.

## 2. How to read these scripts

1. Speak at about 130 words per minute. That is slower than conversation, and it is right for teaching.
2. Every script starts with the same promise: "From Spec to Delivery." Say it the same way every time. It becomes your channel signature.
3. When the script says `[PAUSE]`, stop for one full second. Pauses are where viewers take notes.
4. When the script shows a command in a code block, read the *intent* first ("Here I install the full package into this project"), then type it. Never read a long command character by character.
5. Numbers are your friend on YouTube. The scripts enumerate features as "one, two, three." Count on your fingers on camera. Retention goes up when viewers can track the list.

## 3. The demo repository

Create it once and reuse it for Chapters 02 through 15:

```bash
mkdir workflow-skills-demo && cd workflow-skills-demo
git init
# add one tiny app file so diffs are visible, then commit
git add . && git commit -m "chore: demo seed"
```

Keep a second, throwaway clone for the "what breaks" moments (bad spec, low verify score, dirty review). Breaking your real demo on camera wastes a take. Breaking the throwaway is content.

Before each chapter, run the **Before you record** checklist at the top of that chapter. It tells you the branch, the config state, and the exact starting point, so chapter N+1 always begins where chapter N ended.

## 4. YouTube packaging (copy-paste per video)

Each chapter file already contains its own title, thumbnail text, and description. Three rules for all of them:

1. **Title:** promise plus keyword. Example: "Write Your First Spec That Passes Validation | Workflow Skills #5".
2. **Thumbnail:** three words maximum, huge type. Example: "SPEC → PR". Never put the full title on the thumbnail.
3. **Description:** first line repeats the promise, second line links the previous and next video, then the enumerated **Features in this chapter** list from the chapter file, then timestamps.
4. **Playlist:** one playlist, "Workflow Skills — From Spec to Delivery", videos in chapter order. Pin a comment on video 00 with the full playlist link.
5. **Chapters (timestamps):** add one timestamp per numbered narration section. YouTube turns them into seekable chapters automatically.

## 5. Accessibility and reach

1. Turn on YouTube captions, then correct the technical words once (`ws-spec-to-pr`, `config.json`, `autoMode`). Correct captions are searchable text.
2. Say every acronym in full the first time: "pull request", "acceptance criteria", "Azure DevOps". The scripts already do this. Do not shorten them back.
3. Describe what is on screen in words ("On screen you can see step five, the verify report, with a score of nine"). Audio-only listeners and screen readers get the full course.

## 6. Publish checklist (per video)

1. Title, thumbnail text, and description copied from the chapter file.
2. Playlist position correct; end screen points to the next chapter.
3. Pinned comment: one-sentence recap plus the practice exercise from the chapter.
4. Captions corrected for skill names and config keys.
5. Description includes the exact commands from **Usage examples** so viewers can copy them without pausing the video.
