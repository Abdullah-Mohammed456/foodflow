from pathlib import Path
import subprocess
import shutil
import tempfile
import zipfile
import json

root = Path(__file__).resolve().parent
angle = '25*PI/180*on/95'
zoom = '(1+0.08*on/95)'
left = f'W/2-W/2*cos({angle})*{zoom}'
right = f'W/2+W/2*cos({angle})*{zoom}'
near = f'{zoom}*(1+0.07*sin({angle}))'
far = f'{zoom}*(1-0.07*sin({angle}))'
warp = (f"perspective=x0='{left}':y0='H/2-H/2*{near}':"
        f"x1='{right}':y1='H/2-H/2*{far}':"
        f"x2='{left}':y2='H/2+H/2*{near}':"
        f"x3='{right}':y3='H/2+H/2*{far}':"
        'sense=destination:eval=frame:interpolation=cubic')
filters = ('[0:v]format=rgba[bg];[1:v]scale=760:-1:flags=lanczos,format=rgba,'
           'pad=1100:1000:(ow-iw)/2:(oh-ih)/2:color=0x00000000,' + warp + '[burger];'
           '[bg][burger]overlay=(W-w)/2:(H-h)/2:format=rgb,format=rgb24,split=2[video][frames]')
with tempfile.TemporaryDirectory(prefix='burger-film-') as tmp:
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',
        '-f','lavfi','-i','color=c=0x191b18:s=1920x1080:r=24:d=4,format=rgba',
        '-loop','1','-framerate','24','-i',str(root/'burger-source.png'),
        '-filter_complex_threads','2','-filter_complex',filters,
        '-map','[video]','-frames:v','96','-r','24','-c:v','libx264','-preset','slow',
        '-crf','17','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(root/'burger-film.mp4'),
        '-map','[frames]','-frames:v','96','-compression_level','3',str(Path(tmp)/'frame-%03d.png')],check=True)
    seq = root/'sequence'
    seq.mkdir(exist_ok=True)
    mapping = []
    for i in range(60):
        source = round(i*95/59)
        name = f'burger-{i:03d}.png'
        shutil.copyfile(Path(tmp)/f'frame-{source+1:03d}.png',seq/name)
        mapping.append({'file':name,'source_frame':source,'timestamp_seconds':source/24})
    shutil.copyfile(seq/'burger-000.png',root/'poster.png')
    (root/'sequence-manifest.json').write_text(json.dumps({'width':1920,'height':1080,
        'video_fps':24,'video_duration_seconds':4,'sequence_count':60,
        'sampling':'nearest source frame to 60 uniform targets spanning first and last frames',
        'frames':mapping},indent=2))
    with zipfile.ZipFile(root/'burger-scroll-sequence.zip','w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(seq.glob('*.png')):
            archive.write(path,'sequence/'+path.name)
        archive.write(root/'sequence-manifest.json','sequence-manifest.json')
print('Created video and 60 sequence frames.')
