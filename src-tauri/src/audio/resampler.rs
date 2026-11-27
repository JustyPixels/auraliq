pub fn resample_to_stereo(
    interleaved: &[f32],
    src_channels: usize,
    src_rate: u32,
    dst_rate: u32,
) -> Vec<f32> {
    if interleaved.is_empty() || src_channels == 0 || src_rate == 0 || dst_rate == 0 {
        return Vec::new();
    }

    let src_frames = interleaved.len() / src_channels;
    if src_frames == 0 {
        return Vec::new();
    }

    let frame_sample = |frame: usize| -> (f32, f32) {
        let base = frame * src_channels;
        if src_channels == 1 {
            let v = interleaved[base];
            (v, v)
        } else {
            (interleaved[base], interleaved[base + 1])
        }
    };

    if src_rate == dst_rate {
        let mut out = Vec::with_capacity(src_frames * 2);
        for f in 0..src_frames {
            let (l, r) = frame_sample(f);
            out.push(l);
            out.push(r);
        }
        return out;
    }

    let ratio = src_rate as f64 / dst_rate as f64;
    let dst_frames = ((src_frames as f64) * (dst_rate as f64) / (src_rate as f64)).ceil() as usize;
    let mut out = Vec::with_capacity(dst_frames * 2);

    for i in 0..dst_frames {
        let pos = i as f64 * ratio;
        let idx = (pos.floor() as usize).min(src_frames - 1);
        let next = (idx + 1).min(src_frames - 1);
        let frac = (pos - idx as f64) as f32;
        let (l0, r0) = frame_sample(idx);
        let (l1, r1) = frame_sample(next);
        out.push(l0 + (l1 - l0) * frac);
        out.push(r0 + (r1 - r0) * frac);
    }

    out
}

#[cfg(test)]
mod tests {
    use super::resample_to_stereo;

    #[test]
    fn upmixes_mono_to_stereo() {
        let out = resample_to_stereo(&[0.5, -0.25], 1, 44100, 44100);
        assert_eq!(out, vec![0.5, 0.5, -0.25, -0.25]);
    }

    #[test]
    fn resamples_44100_to_48000() {
        let input = vec![0.25f32; 441 * 2];
        let out = resample_to_stereo(&input, 2, 44100, 48000);
        assert_eq!(out.len() / 2, 480);
    }
}
