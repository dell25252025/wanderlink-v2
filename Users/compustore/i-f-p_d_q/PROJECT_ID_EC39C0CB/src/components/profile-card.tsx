import Image from 'next/image';
import type { UserProfile } from '@/lib/schema';
import { Card } from '@/components/ui/card';
import { BriefcaseBusiness, Coins, Users, CheckCircle, UserPlus, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';


interface ProfileCardProps {
  profile: UserProfile;
  isFriend: boolean;
  onAddFriend: (friendId: string) => void;
  currentUserId: string | null;
  isAddingFriend: boolean;
}

const intentionMap: { [key: string]: { icon: React.ElementType, color: string, text: string } } = {
  'Sponsor': { icon: BriefcaseBusiness, color: 'bg-green-500', text: 'Sponsor' },
  'Sponsorisé': { icon: Coins, color: 'bg-yellow-500', text: 'Sponsorisé' },
  '50/50': { icon: Users, color: 'bg-blue-500', text: '50/50' },
  'Groupe': { icon: Users, color: 'bg-red-500', text: 'Groupe' },
};

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, isFriend, onAddFriend, currentUserId, isAddingFriend }) => {
  const intentionValue = profile.travelIntention || '50/50';
  const intention = intentionMap[intentionValue];

  const handleAddFriendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onAddFriend(profile.id);
  };

  return (
    <Card className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-0 shadow-lg group">
       {/* @ts-ignore */}
      {profile.isOnline && (
        <div className="absolute top-3 right-3 z-10 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
      )}
      <Link href={`/profile?id=${profile.id}`} passHref>
        <div className="cursor-pointer">
            <Image
              src={profile.image}
              alt={profile.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              data-ai-hint="person portrait"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
      </Link>

      <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 text-white w-full flex flex-col items-start justify-end text-left">
        {intention && (
          <div>
            <Badge variant="default" className={cn("border-none text-white text-[8px] md:text-xs h-auto px-1.5 py-0.5 md:px-2 md:py-1", intention.color)}>
              {intention.text}
            </Badge>
          </div>
        )}
        <div className="mt-1">
          <Link href={`/profile?id=${profile.id}`} passHref>
            <h3 className="font-bold text-sm md:text-lg drop-shadow-md flex items-center gap-1 md:gap-1.5 cursor-pointer">
              {profile.name}, {profile.age}
              {profile.isVerified && <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-blue-400" fill="white" />}
            </h3>
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default ProfileCard;
