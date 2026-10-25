# Three countdown presentations

- Before role disclosure (`launch`): armored bulkhead leaves, three lock lights, then the doors slide apart.
- After role disclosure (`post-role`): a split metal ring contracts and rotates around the countdown, then opens sideways.
- After meetings (`meeting-return`): converging light rays and paired expanding shock rings accompany each number over a dimmed view of the map.

The presentation uses the existing countdown and play-start deadlines. The last opening is scheduled on the Web Animations timeline to remain visible with the existing 500ms HUD refresh interval. It does not prolong the countdown or change game commands, movement, or authority.

Finite transform/opacity effects replace the old continuous number pulse and forced digit layout. Hidden presentations cancel their animation handles. Reduced-motion mode retains static compositions. Progress bars, character lineups and background blur remain hidden. Dedicated selectors override the older countdown CSS consistently across desktop, tablet and phone layouts.

GAS export now gathers module-imported CSS as well as linked CSS and embeds it with the bundled game scripts. The voice-free GAS edition is exported as separate literal-code DOCX files for `code.js` and `index.html`.

No gameplay tests or browser playtests were run, per the user's instruction. The production build and document generation are performed for the requested publication.
