# statistical limitations

what this bootstrap measures: resampling uncertainty of Delta on THESE 400 items with the category mix fixed. if we re-ran the same benchmark with the same models, how much would the headline wobble from item luck.

what it does NOT measure: inference repeats, training randomness, deployment drift, other benchmarks, model capability in general. a finite synthetic benchmark never supports population inference about models.

presentation: internals are proportions at full precision. shown as percent for scores, percentage points for differences. rounding happens only for display and never feeds the conclusion rule.
